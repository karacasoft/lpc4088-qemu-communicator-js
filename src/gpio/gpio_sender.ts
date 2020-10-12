import { PortType, PinType, QemuMessage } from '../qemu_mq_types';
import { SENDING_MAGIC_NUMBER } from '../constants';

enum GPIO_COMMANDS {
    SET_PORT_PIN = 0x100,
    CLR_PORT_PIN = 0x200,
    STATUS = 0x300
}

export function set_port_pin(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (port: PortType, pin: PinType) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: GPIO_COMMANDS.SET_PORT_PIN,
            arg1: port.toString().charCodeAt(0),
            arg2: pin,
            arg3: 0,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        };
        sendMessageFunc(msg);
    }
}

export function clr_port_pin(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (port: PortType, pin: PinType) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: GPIO_COMMANDS.CLR_PORT_PIN,
            arg1: port.toString().charCodeAt(0),
            arg2: pin,
            arg3: 0,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        };
        sendMessageFunc(msg);
    }
}

export function status(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return () => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: GPIO_COMMANDS.STATUS,
            arg1: 0,
            arg2: 0,
            arg3: 0,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        };
        sendMessageFunc(msg);
    }
}