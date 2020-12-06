export const QEMU_RC_HOST = '127.0.0.1';
export const QEMU_RC_PORT = 6942;


export const SENDING_MAGIC_NUMBER = 0xDEADBEEB;

export const MAGIC_NUMBERS: { [k: number]: string } = {
    [0xDEADBEE2]: "GPIO",
    [0x1EE7C0DE]: "IOCON",
    [0xDEEDBEE3]: "TIMER",
    [0xBADB0001]: "USART",
    [0xEADDBEE3]: "PWM",
};

export const GPIO_RECEIVED_MESSAGE_CODES: { [k: number]: string} = {
    [0]: "status"
};

export const IOCON_RECEIVED_MESSAGE_CODES: { [k: number]: string} = {
    [0]: "pin_status"
};

export const TIMER_RECEIVED_MESSAGE_CODES: { [k: number]: string} = {
    [0]: "reg_status",
    [1]: "emr_change"
}

export const USART_RECEIVED_MESSAGE_CODES: { [k: number]: string} = {
    [0]: "char"
}

export const PWM_RECEIVED_MESSAGE_CODES: { [k: number]: string} = {
    [0]: "reg_status"
}

export const QEMU_PATH = process.env.QEMU_PATH ?
        process.env.QEMU_PATH : "/run/media/karacasoft/KSYedeks/src/qemu/bin/debug/arm/arm-softmmu/qemu-system-arm";