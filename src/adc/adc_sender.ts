import { QemuMessage } from '../qemu_mq_types';
import { SENDING_MAGIC_NUMBER } from '../constants';

enum ADC_COMMANDS {
    SET_ADC_VALUE = 0x21000100,
}

export function set_adc_value(sendMessageFunc: (msg: QemuMessage) => boolean) {
    return (adc: number, channel: number, value: number) => {
        let msg: QemuMessage = {
            magic: SENDING_MAGIC_NUMBER,
            cmd: ADC_COMMANDS.SET_ADC_VALUE,
            arg1: adc.toString().charCodeAt(0),
            arg2: channel,
            arg3: value,
            arg4: 0,
            arg5: 0,
            arg6: 0,
        };
        sendMessageFunc(msg);
    }
}