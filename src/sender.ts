import PosixMQ from 'posix-mq';
import { QemuMessage } from './qemu_mq_types';
import os from 'os';

const SenderMQ = new PosixMQ();

SenderMQ.open({
    name: '/qemu_rc',
    create: false,
    maxmsgs: 10,
    msgsize: 32
});

function sendMessage(msg: QemuMessage): boolean {
    let buffer = Buffer.alloc(32);
    if(os.endianness() === 'LE') {
        buffer.writeUInt32LE(msg.magic, 0);
        buffer.writeUInt32LE(msg.cmd, 4);
        buffer.writeUInt32LE(msg.arg1, 8);
        buffer.writeUInt32LE(msg.arg2, 12);
        buffer.writeUInt32LE(msg.arg3, 16);
        buffer.writeUInt32LE(msg.arg4, 20);
        buffer.writeUInt32LE(msg.arg5, 24);
        buffer.writeUInt32LE(msg.arg6, 28);
    } else {
        buffer.writeUInt32BE(msg.magic, 0);
        buffer.writeUInt32BE(msg.cmd, 4);
        buffer.writeUInt32BE(msg.arg1, 8);
        buffer.writeUInt32BE(msg.arg2, 12);
        buffer.writeUInt32BE(msg.arg3, 16);
        buffer.writeUInt32BE(msg.arg4, 20);
        buffer.writeUInt32BE(msg.arg5, 24);
        buffer.writeUInt32BE(msg.arg6, 28);
    }
    let r: boolean;
    r = SenderMQ.push(buffer);
    return r;
}

export default {
    mq: SenderMQ,
    sendMessage,
};