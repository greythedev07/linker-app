import { supabase } from '../lib/supabase';

/**
 * LINKER P2P SIGNALING ENGINE
 * Handles WebRTC handshake via Supabase Realtime.
 */

export const SignalingEngine = {
  /**
   * Initializes a signaling channel between two peers.
   */
  createChannel: (roomId, onSignal) => {
    const channel = supabase.channel(`call:${roomId}`);
    
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        onSignal(payload);
      })
      .subscribe();

    return {
      sendSignal: (payload) => {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload,
        });
      },
      close: () => {
        supabase.removeChannel(channel);
      }
    };
  }
};
