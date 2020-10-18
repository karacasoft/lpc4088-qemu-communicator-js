import PosixMQ from 'posix-mq';
import { PinType, PortType, PwmType, QemuMessage, TimerType, toPinType, toPortType, toPwmType, toTimerType, toUsartType, UsartType } from './qemu_mq_types';
import os from 'os';
import { GPIO_RECEIVED_MESSAGE_CODES, IOCON_RECEIVED_MESSAGE_CODES, MAGIC_NUMBERS, PWM_RECEIVED_MESSAGE_CODES, TIMER_RECEIVED_MESSAGE_CODES, USART_RECEIVED_MESSAGE_CODES } from './constants';

export type QemuEventData = GPIOEventLogEntry |
                       IOCONEventLogEntry |
                       TIMEREventLogEntry |
                       USARTEventLogEntry |
                       PWMEventLogEntry;

export interface GPIOEventLogEntry {
    module: "GPIO";
    event: "reg_change";
    port: PortType;
    DIR: number;
    MASK: number;
    PIN: number;
}

export interface IOCONEventLogEntry {
    module: "IOCON";
    event: "reg_change";
    port: PortType;
    pin: PinType;
    value: number;
}

export interface TIMEREventLogEntry {
    module: "TIMER";
    event: "reg_change";
    timer_name: TimerType;
    reg_offset: number; // TODO extract register name from offset MAYBEEEEEE?????
    value: number;
}

export type USARTEventLogEntry = USARTCharEventLogEntry;

export interface USARTCharEventLogEntry {
    module: "USART";
    event: "char";
    usart_name: UsartType;
    received_char: string;
}

export interface PWMEventLogEntry {
    module: "PWM";
    event: "reg_change";
    pwm_name: PwmType;
    reg_offset: number; // TODO extract register name from offset MAYBEEEEEE?????
    value: number;
}

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

let external_rec_handler: ((msg: QemuEventData) => void) | undefined = undefined;

function parse_message_fields(msg: QemuMessage) {
    let event_data: QemuEventData | undefined;
    if(MAGIC_NUMBERS[msg.magic] === "GPIO") {
        if(GPIO_RECEIVED_MESSAGE_CODES[msg.cmd] === "status") {
            let port = toPortType(msg.arg1 - "0".charCodeAt(0));
            if(port === undefined) {
                console.log("Log message skipped. Port name is undefined");
            } else {
                event_data = {
                    module: "GPIO",
                    event: "reg_change",
                    port: port,
                    DIR: msg.arg2,
                    MASK: msg.arg3,
                    PIN: msg.arg4,
                };
            }
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "IOCON") {
        if(IOCON_RECEIVED_MESSAGE_CODES[msg.cmd] === "pin_status") {
            const port = toPortType(msg.arg1 - "0".charCodeAt(0));
            const pin = toPinType(msg.arg2);
            if(port === undefined || pin === undefined) {
                console.log("Log message skipped. Port name or pin number is undefined");
            } else {
                event_data = {
                    module: "IOCON",
                    event: "reg_change",
                    port: port,
                    pin: pin,
                    value: msg.arg3,
                };
            }
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "TIMER") {
        if(TIMER_RECEIVED_MESSAGE_CODES[msg.cmd] === "reg_status") {
            const timer_name = toTimerType(msg.arg1 - "0".charCodeAt(0));
            if(timer_name === undefined) {
                console.log("Log message skipped. Timer name is undefined");
            } else {
                event_data = {
                    module: "TIMER",
                    event: "reg_change",
                    timer_name: timer_name,
                    reg_offset: msg.arg2,
                    value: msg.arg3,
                };
            }
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "USART") {
        if(USART_RECEIVED_MESSAGE_CODES[msg.cmd] === "char") {
            const usart_name = toUsartType(msg.arg1 - "0".charCodeAt(0));
            if(usart_name === undefined) {
                console.log("Log message skipped. Usart name is undefined");
            } else {
                event_data = {
                    module: "USART",
                    event: "char",
                    usart_name: usart_name,
                    received_char: String.fromCharCode(msg.arg2),
                };
            }
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "PWM") {
        if(PWM_RECEIVED_MESSAGE_CODES[msg.cmd] === "reg_status") {
            const pwm_name = toPwmType(msg.arg1 - "0".charCodeAt(0));
            if(pwm_name === undefined) {
                console.log("Log message skipped. PWM name is undefined");
            } else {
                event_data = {
                    module: "PWM",
                    event: "reg_change",
                    pwm_name: pwm_name,
                    reg_offset: msg.arg2,
                    value: msg.arg3,
                };
            }
        }
    }
    return event_data;
}

let rec_handler = function() {
    const mq = rec_mq;
    let n;
    while((n = mq.shift(readbuf)) !== false) {
        //console.log(`Received message (${n} bytes)`);
        let msg = parseMessage(readbuf);
        let data = parse_message_fields(msg);
        if(external_rec_handler !== undefined && data !== undefined) {
            external_rec_handler(data);
        }
        //console.log(msg);
    }
};



export default {
    open: () => {
        rec_mq.open({
            name: '/qemu_rc_out',
            maxmsgs: 10,
            msgsize: 32
        });

        rec_mq.on('messages', rec_handler);

        rec_handler();
    },
    close: () => {
        rec_mq.close();
    },
    set_receive_handler: (handler: (msg: QemuEventData) => void) => external_rec_handler = handler,
    triggerReceiveHandler: () => { rec_handler(); },
};