import { getLiveRooms, liveSocket } from '@/ts/live-engine';

$(function () {
  console.log('loaded');
  getLiveRooms().then((liveRooms) => {
    liveRooms.map((liveRoom) => {
      console.log(liveRoom);
    });
  });

  // liveSocket.emit('ping');
  // liveSocket.on('ping', console.log);
});
