import { useState } from 'react';
import { motion } from 'framer-motion';
import { DSRooms } from '@/components/icons/BrandIcons';
import { Plus, Users } from 'lucide-react';

export default function RoomsPage() {
  const [rooms] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-[#08080D] relative">
      <div className="aurora" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold gradient-text tracking-tight">Rooms</h1>
            <p className="text-sm text-white/40 mt-1">Chat with voice, together</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white text-sm font-semibold rounded-2xl shadow-depth-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </motion.button>
        </motion.div>

        {/* Empty state */}
        {rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-strong rounded-3xl p-10 shadow-depth-3 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl glass flex items-center justify-center relative">
              <div className="absolute inset-0 gradient-brand rounded-3xl blur-xl opacity-30" />
              <DSRooms className="w-10 h-10 text-white relative" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No active rooms</h3>
            <p className="text-sm text-white/50 max-w-xs mx-auto mb-6">
              Start a room and invite your friends for a live conversation.
            </p>
            <button className="inline-flex items-center gap-2 px-5 py-3 gradient-brand text-white font-semibold rounded-2xl shadow-depth-2">
              <Users className="w-4 h-4" />
              Start your first room
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room: any) => (
              <div key={room.id} className="glass rounded-2xl p-4">
                {room.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
