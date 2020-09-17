import PosixMQ from 'posix-mq';
import { QemuMessage } from './qemu_mq_types';
import os from 'os';

const rec_mq = new PosixMQ();

let readbuf = Buffer.alloc(32);

function parseMessage(msg: Buffer): QemuMessage {
    let qemu_msg: QemuMessage;
    if(os.endianness() === "LE") {
        qemu_msg = {
            magic: msg.readUInt32LE(0),
            cmd: msg.readUInt32LE(4),
            arg1: msg.readUInt32LE(8),
            arg2: msg.readUInt32LE(12),
            arg3: msg.readUInt32LE(16),
            arg4: msg.readUInt32LE(20),
            arg5: msg.readUInt32LE(24),
            arg6: msg.readUInt32LE(28),
        };
    } else {
        qemu_msg = {
            magic: msg.readUInt32BE(0),
            cmd: msg.readUInt32BE(4),
            arg1: msg.readUInt32BE(8),
            arg2: msg.readUInt32BE(12),
            arg3: msg.readUInt32BE(16),
            arg4: msg.readUInt32BE(20),
            arg5: msg.readUInt32BE(24),
            arg6: msg.readUInt32BE(28),
        };
    }
    return qemu_msg;
}

let rec_handler = function() {
    const mq = rec_mq;
    let n;
    while((n = mq.shift(readbuf)) !== false) {
        console.log(`Received message (${n} bytes)`);
        let msg = parseMessage(readbuf);
        console.log(msg);
    }
};

rec_mq.on('messages', rec_handler);

rec_mq.open({
    name: '/qemu_rc_out',
    create: false,
    maxmsgs: 10,
    msgsize: 32
});

export default {
    mq: rec_mq,
    triggerReceiveHandler: () => { rec_handler(); },
};