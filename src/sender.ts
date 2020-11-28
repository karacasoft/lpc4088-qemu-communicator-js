import { QemuMessage, QemuMessageGeneric } from './qemu_mq_types';
import { clr_port_pin, set_port_pin, status } from './gpio/gpio_sender';
import { get_pin_iocon } from './iocon/iocon_sender';
import { send_capture } from './timer/timer_sender';
import os from 'os';
import { send_chars } from './usart/usart_sender';
import { set_adc_value } from './adc/adc_sender';
import { set_ext_int_pin } from './sc/sc_sender';
import QemuConnector from './qemu_connector';

function sendMessage(msg: QemuMessage): boolean {
    let buffer = Buffer.alloc(32);
    buffer.writeUInt32BE(msg.magic, 0);
    buffer.writeUInt32BE(msg.cmd, 4);
    buffer.writeUInt32BE(msg.arg1, 8);
    if(msg.chars) {
        console.log(msg.chars.substr(0, 20));
        buffer.write(msg.chars.substr(0, 20), 12, "ascii");
    } else {
        buffer.writeUInt32BE(msg.arg2, 12);
        buffer.writeUInt32BE(msg.arg3, 16);
        buffer.writeUInt32BE(msg.arg4, 20);
        buffer.writeUInt32BE(msg.arg5, 24);
        buffer.writeUInt32BE(msg.arg6, 28);
    }
    QemuConnector.send(buffer);
    return true;
}

export const GPIO = {
    set_pin: set_port_pin(sendMessage),
    clr_pin: clr_port_pin(sendMessage),
    status: status(sendMessage),
}

export const IOCON = {
    get_pin: get_pin_iocon(sendMessage),
}

export const TIMER = {
    send_capture: send_capture(sendMessage),
}

export const USART = {
    usart_send_chars: send_chars(sendMessage),
}

export const ADC = {
    adc_set_value: set_adc_value(sendMessage),
}

export const SC = {
    set_ext_int_pin: set_ext_int_pin(sendMessage),
}

export default {
    open: async () => {
        await QemuConnector.connect();
    },
    close: async () => {
        await QemuConnector.disconnect();
    },
    sendMessage,
    
};