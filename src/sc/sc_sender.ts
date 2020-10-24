import { QemuMessage } from '../qemu_mq_types';
import { SENDING_MAGIC_NUMBER } from '../constants';

enum SC_COMMANDS {
    EXTERNAL_INT_SET_PIN = 0x31000100,
}

export function set_ext_int_pin(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (channel: number, value: number) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: SC_COMMANDS.EXTERNAL_INT_SET_PIN,
            arg1: "0".charCodeAt(0),
            arg2: channel,
            arg3: value,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        };
        sendMessageFunc(msg);
    }
}