import net from 'net';
import CRC from 'crc-32';
import { QemuMessage } from './qemu_mq_types';
import { MAGIC_NUMBERS, QEMU_RC_HOST, QEMU_RC_PORT } from './constants';

export type OnReceiveData = (data: QemuMessage) => void;

export interface QemuConnector {
    client: net.Socket;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    send: (data: Buffer) => void;
    setOnReceive: (onReceive: OnReceiveData) => void;
}

const port = QEMU_RC_PORT;
const host = QEMU_RC_HOST;

let clientConnected = false;
const client = new net.Socket();

let onReceiveData: OnReceiveData | null = null;

function onClientData() {

    let totalBuffer = Buffer.alloc(102400, 0);
    let currentPos = 0;
    let readPos = 0;

    return (data: Buffer) => {
        data.copy(totalBuffer, currentPos, 0);
        currentPos += data.length;
        if(currentPos > 10240) console.log("Buffer size exceeded");
        while(currentPos - readPos >= 36) {
            const msg_buf = totalBuffer.subarray(readPos, readPos + 36);
            if(MAGIC_NUMBERS[msg_buf.readUInt32BE(0)] === undefined) {
                readPos += 4;
                continue;
            }
            const crc32 = msg_buf.readInt32BE(32);
            const crc_calc = CRC.buf(msg_buf.subarray(0, 32), 0);

            if(crc32 === crc_calc) {
                const msg: QemuMessage = {
                    magic: msg_buf.readUInt32BE(0),
                    cmd: msg_buf.readUInt32BE(4),
                    arg1: msg_buf.readUInt32BE(8),
                    arg2: msg_buf.readUInt32BE(12),
                    arg3: msg_buf.readUInt32BE(16),
                    arg4: msg_buf.readUInt32BE(20),
                    arg5: msg_buf.readUInt32BE(24),
                    arg6: msg_buf.readUInt32BE(28),
                };
                onReceiveData && onReceiveData(msg);
                readPos += 36;
            } else {
                console.log("Corrupt message received");
                readPos += 4;
            }
            
        }
        if(currentPos > readPos) {
            totalBuffer.copyWithin(0, readPos, currentPos);
            currentPos = (currentPos - readPos);
            readPos = 0;
        }
    }
}

async function connect() {
    if(clientConnected) return;
    if(client.connecting) return;
    return new Promise<void>((resolve, reject) => {
        client.removeAllListeners();
        client.on('connect', () => {
            clientConnected = true;

            client.on('data', onClientData());
            client.removeAllListeners('connect');
            client.removeAllListeners('error');
            client.on('error', () => {
                clientConnected = false;
            });
            resolve();
        });
        client.on('error', (err) => {
            console.error(err);
            clientConnected = false;
            client.removeAllListeners('connect');
            client.removeAllListeners('error');
            reject(err);
        });
        client.connect({ host, port });
    });
}

async function disconnect() {
    client.destroy();
    if(!clientConnected) return;
    clientConnected = false;
}

function send(data: Buffer) {
    if(!clientConnected) {
        throw new Error("Connect first");
    }
    const crc32 = CRC.buf(data, 0);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeInt32BE(crc32, 0);
    client.write(data);
    client.write(crcBuffer);
}

function setOnReceiveData(_onReceiveData: OnReceiveData) {
    onReceiveData = _onReceiveData;
}

const QEMU_CONNECTOR: QemuConnector = {
    client,
    connect,
    disconnect,
    send,
    setOnReceive: setOnReceiveData,
};

export default QEMU_CONNECTOR