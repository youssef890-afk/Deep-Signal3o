import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type CallStatus = 'idle' | 'incoming' | 'calling' | 'connecting' | 'connected';

interface CallSignal {
  kind: 'offer' | 'answer' | 'ice' | 'decline' | 'hangup';
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export function useDirectCall(userId: string | undefined, peerId: string | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const statusRef = useRef(status);
  statusRef.current = status;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [channelReady, setChannelReady] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const sendSignal = useCallback((signal: CallSignal) => {
    const channel = channelRef.current;
    if (channel) void channel.send({ type: 'broadcast', event: 'call-signal', payload: signal });
  }, []);

  const makePeerConnection = useCallback((stream: MediaStream) => {
    if (!userId || !peerId) throw new Error('المحادثة غير جاهزة للمكالمة');
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnectionRef.current = connection;
    for (const track of stream.getTracks()) connection.addTrack(track, stream);
    connection.ontrack = (event) => {
      const [incomingStream] = event.streams;
      if (incomingStream) setRemoteStream(incomingStream);
    };
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          kind: 'ice',
          from: userId,
          to: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') setStatus('connected');
      if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        setError('انقطع الاتصال. تحقق من الشبكة وأعد المحاولة.');
        setStatus('connecting');
      }
    };
    return connection;
  }, [peerId, sendSignal, userId]);

  const acquireMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicrophoneEnabled(true);
    setCameraEnabled(true);
    return stream;
  }, []);

  const flushCandidates = useCallback(async (connection: RTCPeerConnection) => {
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) await connection.addIceCandidate(candidate);
  }, []);

  const releaseCall = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('idle');
    setMicrophoneEnabled(true);
    setCameraEnabled(true);
  }, []);

  useEffect(() => {
    if (!userId || !peerId) {
      setChannelReady(false);
      releaseCall();
      return;
    }

    let active = true;
    const channelId = [userId, peerId].sort().join(':');
    const channel = supabase.channel(`direct-call:${channelId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
      const signal = payload as CallSignal;
      if (!active || signal.from !== peerId || signal.to !== userId) return;

      try {
        if (signal.kind === 'offer' && signal.description && statusRef.current === 'idle') {
          incomingOfferRef.current = signal.description;
          setError('');
          setStatus('incoming');
        } else if (signal.kind === 'answer' && signal.description && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(signal.description);
          await flushCandidates(peerConnectionRef.current);
          setStatus('connecting');
        } else if (signal.kind === 'ice' && signal.candidate) {
          const connection = peerConnectionRef.current;
          if (connection?.remoteDescription) await connection.addIceCandidate(signal.candidate);
          else pendingCandidatesRef.current.push(signal.candidate);
        } else if (signal.kind === 'decline' || signal.kind === 'hangup') {
          releaseCall();
          if (signal.kind === 'decline') setError('تم رفض المكالمة.');
        }
      } catch (callError) {
        setError(callError instanceof Error ? callError.message : 'تعذر بدء المكالمة');
        releaseCall();
      }
    });
    channel.subscribe((channelStatus) => {
      if (active) setChannelReady(channelStatus === 'SUBSCRIBED');
    });
    channelRef.current = channel;

    return () => {
      active = false;
      setChannelReady(false);
      channelRef.current = null;
      releaseCall();
      void supabase.removeChannel(channel);
    };
  }, [flushCandidates, peerId, releaseCall, userId]);

  const startCall = useCallback(async () => {
    if (!userId || !peerId || !channelReady || status !== 'idle') return;
    setError('');
    try {
      const stream = await acquireMedia();
      const connection = makePeerConnection(stream);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      if (connection.localDescription) {
        sendSignal({ kind: 'offer', from: userId, to: peerId, description: connection.localDescription.toJSON() });
      }
      setStatus('calling');
    } catch (callError) {
      releaseCall();
      setError(callError instanceof Error ? callError.message : 'تحقق من إذن الكاميرا والميكروفون');
    }
  }, [acquireMedia, channelReady, makePeerConnection, peerId, releaseCall, sendSignal, status, userId]);

  const acceptCall = useCallback(async () => {
    const offer = incomingOfferRef.current;
    if (!userId || !peerId || !offer) return;
    setError('');
    try {
      const stream = await acquireMedia();
      const connection = makePeerConnection(stream);
      await connection.setRemoteDescription(offer);
      await flushCandidates(connection);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      if (connection.localDescription) {
        sendSignal({ kind: 'answer', from: userId, to: peerId, description: connection.localDescription.toJSON() });
      }
      setStatus('connecting');
    } catch (callError) {
      releaseCall();
      setError(callError instanceof Error ? callError.message : 'تعذر قبول المكالمة');
    }
  }, [acquireMedia, flushCandidates, makePeerConnection, peerId, releaseCall, sendSignal, userId]);

  const declineCall = useCallback(() => {
    if (userId && peerId) sendSignal({ kind: 'decline', from: userId, to: peerId });
    releaseCall();
  }, [peerId, releaseCall, sendSignal, userId]);

  const endCall = useCallback(() => {
    if (userId && peerId && status !== 'idle') sendSignal({ kind: 'hangup', from: userId, to: peerId });
    releaseCall();
  }, [peerId, releaseCall, sendSignal, status, userId]);

  const toggleMicrophone = useCallback(() => {
    const enabled = !microphoneEnabled;
    for (const track of localStreamRef.current?.getAudioTracks() ?? []) track.enabled = enabled;
    setMicrophoneEnabled(enabled);
  }, [microphoneEnabled]);

  const toggleCamera = useCallback(() => {
    const enabled = !cameraEnabled;
    for (const track of localStreamRef.current?.getVideoTracks() ?? []) track.enabled = enabled;
    setCameraEnabled(enabled);
  }, [cameraEnabled]);

  return {
    status,
    channelReady,
    localStream,
    remoteStream,
    error,
    microphoneEnabled,
    cameraEnabled,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
  };
}