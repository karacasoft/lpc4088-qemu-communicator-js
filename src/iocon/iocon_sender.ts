import { PortType, PinType, QemuMessage } from '../qemu_mq_types';
import { SENDING_MAGIC_NUMBER } from '../constants';

enum IOCON_COMMANDS {
    GET_PIN_STATUS = 0x10100,
}

export function get_pin_iocon(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (port: PortType, pin: PinType) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: IOCON_COMMANDS.GET_PIN_STATUS,
            arg1: port.toString().charCodeAt(0),
            arg2: pin,
            arg3: 0,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        }
        sendMessageFunc(msg);
    }
}