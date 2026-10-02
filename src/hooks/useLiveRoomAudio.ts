import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RemoteRoomAudio {
  userId: string;
  stream: MediaStream;
}

interface SignalMessage {
  from: string;
  to?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export function useLiveRoomAudio(roomId: string, userId: string | undefined, isMember: boolean, muted: boolean) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const politeRef = useRef(new Map<string, boolean>());
  const makingOfferRef = useRef(new Map<string, boolean>());
  const ignoreOfferRef = useRef(new Map<string, boolean>());
  const [remoteAudio, setRemoteAudio] = useState<RemoteRoomAudio[]>([]);
  const [audioStarted, setAudioStarted] = useState(false);
  const [error, setError] = useState('');

  const sendSignal = useCallback((message: SignalMessage) => {
    if (!channelRef.current) return;
    void channelRef.current.send({ type: 'broadcast', event: 'signal', payload: message });
  }, []);

  const getPeer = useCallback((peerId: string) => {
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peersRef.current.set(peerId, peer);
    politeRef.current.set(peerId, Boolean(userId && userId.localeCompare(peerId) > 0));
    makingOfferRef.current.set(peerId, false);
    ignoreOfferRef.current.set(peerId, false);

    for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
      peer.addTrack(track, localStreamRef.current!);
    }

    peer.onicecandidate = (event) => {
      if (event.candidate && userId) sendSignal({ from: userId, to: peerId, candidate: event.candidate.toJSON() });
    };
    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      setRemoteAudio((current) => current.some((item) => item.userId === peerId)
        ? current.map((item) => item.userId === peerId ? { ...item, stream } : item)
        : [...current, { userId: peerId, stream }]);
    };
    peer.onnegotiationneeded = async () => {
      if (!userId || !channelRef.current) return;
      try {
        makingOfferRef.current.set(peerId, true);
        await peer.setLocalDescription();
        if (peer.localDescription) sendSignal({ from: userId, to: peerId, description: peer.localDescription.toJSON() });
      } catch (negotiationError) {
        console.error('Room negotiation failed:', negotiationError);
      } finally {
        makingOfferRef.current.set(peerId, false);
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        peer.close();
        peersRef.current.delete(peerId);
        setRemoteAudio((current) => current.filter((item) => item.userId !== peerId));
      }
    };
    return peer;
  }, [sendSignal, userId]);

  useEffect(() => {
    if (!roomId || !userId || !isMember) return;
    let active = true;
    const peers = peersRef.current;
    const channel = supabase.channel(`room-audio:${roomId}`, { config: { broadcast: { self: false } } });

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const message = payload as SignalMessage;
      if (!active || !message.from || message.from === userId || (message.to && message.to !== userId)) return;
      const peer = getPeer(message.from);

      try {
        if (message.description) {
          const readyForOffer = !makingOfferRef.current.get(message.from) && (peer.signalingState === 'stable' || peer.signalingState === 'have-local-offer');
          const collision = message.description.type === 'offer' && !readyForOffer;
          const ignoreOffer = !politeRef.current.get(message.from) && collision;
          ignoreOfferRef.current.set(message.from, ignoreOffer);
          if (ignoreOffer) return;

          await peer.setRemoteDescription(message.description);
          if (message.description.type === 'offer') {
            await peer.setLocalDescription();
            if (peer.localDescription) sendSignal({ from: userId, to: message.from, description: peer.localDescription.toJSON() });
          }
        } else if (message.candidate && !ignoreOfferRef.current.get(message.from)) {
          await peer.addIceCandidate(message.candidate);
        }
      } catch (signalError) {
        console.error('Room audio signaling failed:', signalError);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && active) sendSignal({ from: userId });
    });
    channelRef.current = channel;

    return () => {
      active = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
      for (const peer of peers.values()) peer.close();
      peers.clear();
      setRemoteAudio([]);
    };
  }, [getPeer, isMember, roomId, sendSignal, userId]);

  useEffect(() => {
    for (const track of localStreamRef.current?.getAudioTracks() ?? []) track.enabled = !muted;
  }, [muted]);

  const startAudio = useCallback(async () => {
    if (!isMember || localStreamRef.current) return;
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      for (const track of stream.getAudioTracks()) track.enabled = !muted;
      setAudioStarted(true);
      for (const [peerId, peer] of peersRef.current) {
        for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
        if (peer.signalingState === 'stable' && userId) {
          await peer.setLocalDescription();
          if (peer.localDescription) sendSignal({ from: userId, to: peerId, description: peer.localDescription.toJSON() });
        }
      }
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'تعذر تشغيل الميكروفون');
    }
  }, [isMember, muted, sendSignal, userId]);

  const stopAudio = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setAudioStarted(false);
  }, []);

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return { remoteAudio, audioStarted, error, startAudio, stopAudio };
}