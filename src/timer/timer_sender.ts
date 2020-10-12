import { QemuMessage, TimerType } from '../qemu_mq_types';
import { SENDING_MAGIC_NUMBER } from '../constants';

enum TIMER_COMMANDS {
    SEND_CAPTURE = 0x11000100,
}



export function send_capture(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (timer: TimerType, capture_pin: 0 | 1, rising_edge: boolean) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: TIMER_COMMANDS.SEND_CAPTURE,
            arg1: timer.toString().charCodeAt(0),
            arg2: capture_pin,
            arg3: rising_edge ? 1 : 2,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        };
        sendMessageFunc(msg);
    }
}