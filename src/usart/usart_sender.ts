import { SENDING_MAGIC_NUMBER } from "../constants";
import { QemuMessage, UsartType } from "../qemu_mq_types";

enum USART_COMMANDS {
    SEND_CHARS = 0x20100,
}

export function send_chars(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (usart: UsartType, chars: string) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: USART_COMMANDS.SEND_CHARS,
            arg1: usart.toString().charCodeAt(0),
            chars: chars,
            arg2: 0,
            arg3: 0,
            arg4: 0,
            arg5: 0,
            arg6: 0
        };
        sendMessageFunc(msg);
    }

}