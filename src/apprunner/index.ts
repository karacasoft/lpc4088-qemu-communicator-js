import SenderMQ, { GPIO, IOCON, TIMER, USART } from '../sender';
import ReceiverMQ, { QemuEventData } from '../receiver';
import { PinType, PortType, PwmType, QemuMessage, TimerType, toPinType, toPortType, toPwmType, toTimerType, toUsartType, UsartType } from '../qemu_mq_types';
import fs from 'fs';
import { GPIO_RECEIVED_MESSAGE_CODES, IOCON_RECEIVED_MESSAGE_CODES, MAGIC_NUMBERS, PWM_RECEIVED_MESSAGE_CODES, TIMER_RECEIVED_MESSAGE_CODES, USART_RECEIVED_MESSAGE_CODES } from '../constants';
import { exit } from 'process';
import { start_qemu, QemuProcessInterface } from './qemu_runner';

enum AppRunnerCommands {
    WAIT = "WAIT",
    WAIT_UNTIL_KEY_PRESS = "WAIT_UNTIL_KEY_PRESS",
    START_EXEC = "START_EXEC",

    GPIO_SET_PIN = "GPIO_SET_PIN",
    GPIO_CLR_PIN = "GPIO_CLR_PIN",
    GPIO_STATUS = "GPIO_STATUS",

    IOCON_GET_PIN = "IOCON_GET_PIN",

    TIMER_SEND_CAPTURE = "TIMER_SEND_CAPTURE",

    USART_SEND_STR = "USART_SEND_STR",

    LOG = "LOG",
}

export interface CustomLogEvent {
    text: string;
}

export type CustomLogEventHandler = (ev: CustomLogEvent) => void;


const keypress = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
    }))
};

export function log_file_msg_handler(log_file_fd: number) {
    return (msg: QemuEventData) => {
        if(msg.module === "GPIO") {
            if(msg.event === "reg_change") {
                let gpio_status_dir = `${Date.now()} GPIO DIR${msg.port} 0x${msg.DIR.toString(16)}\n`;
                let gpio_status_mask = `${Date.now()} GPIO MASK${msg.port} 0x${msg.MASK.toString(16)}\n`;
                let gpio_status_pin = `${Date.now()} GPIO PIN${msg.port} 0x${msg.PIN.toString(16)}\n`;
                fs.writeSync(log_file_fd, gpio_status_dir);
                fs.writeSync(log_file_fd, gpio_status_mask);
                fs.writeSync(log_file_fd, gpio_status_pin);
            }
        } else if(msg.module === "IOCON") {
            if(msg.event === "reg_change") {
                let iocon_pin_status = `${Date.now()} IOCON ${msg.port} ${msg.pin} 0x${msg.value.toString(16)}\n`;
                fs.writeSync(log_file_fd, iocon_pin_status);
            }
        } else if(msg.module === "TIMER") {
            if(msg.event === "reg_change") {
                let timer_reg_status = `${Date.now()} TIMER${msg.timer_name} ${msg.reg_offset} 0x${msg.value.toString(16)}\n`;
                fs.writeSync(log_file_fd, timer_reg_status);
            }
        } else if(msg.module === "USART") {
            if(msg.event === "char") {
                let usart_received_char = `${Date.now()} USART${msg.usart_name} CHAR ${msg.received_char}\n`;
                fs.writeSync(log_file_fd, usart_received_char);
            }
        } else if(msg.module === "PWM") {
            if(msg.event === "reg_change") {
                let pwm_reg_status = `${Date.now()} PWM${msg.pwm_name} ${msg.reg_offset} 0x${msg.value.toString(16)}\n`;
                fs.writeSync(log_file_fd, pwm_reg_status);
            }
        }
    }
}

export function object_msg_handler(log: QemuEventData[]) {
    return (msg: QemuEventData) => {
        log.push(msg);
    }
}

async function sleep(ms: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve(); }, ms);
    });
}

async function execute_command(cmd: string, qemu: QemuProcessInterface, log_event_handler?: CustomLogEventHandler) {
    let args = cmd.split(" ");
    switch(args[0] as AppRunnerCommands) {
        case AppRunnerCommands.WAIT:
            if(args.length !== 2) {
                console.error("Command WAIT failed, invalid arguments.");
            }
            console.log(`WAITing ${args[1]} milliseconds`);
            await sleep(parseInt(args[1]));
            break;
        case AppRunnerCommands.WAIT_UNTIL_KEY_PRESS:
            await keypress();
            break;
        case AppRunnerCommands.GPIO_SET_PIN:
            {
                const port = toPortType(parseInt(args[1]));
                const pin = toPinType(parseInt(args[2]));
                if(port !== undefined && pin !== undefined) {
                    GPIO.set_pin(port, pin);
                } else {
                    console.error(`Command GPIO_SET_PIN failed, invalid arguments.`);
                }
            }
            break;
        case AppRunnerCommands.GPIO_CLR_PIN:
            {
                const port = toPortType(parseInt(args[1]));
                const pin = toPinType(parseInt(args[2]));
                if(port !== undefined && pin !== undefined) {
                    GPIO.clr_pin(port, pin);
                } else {
                    console.error(`Command GPIO_CLR_PIN failed, invalid arguments.`);
                }
            }
            break;
        case AppRunnerCommands.GPIO_STATUS:
            GPIO.status();
            ReceiverMQ.triggerReceiveHandler();
            break;
        case AppRunnerCommands.IOCON_GET_PIN:
            {
                const port = toPortType(parseInt(args[1]));
                const pin = toPinType(parseInt(args[2]));
                if(port !== undefined && pin !== undefined) {
                    IOCON.get_pin(port, pin);
                } else {
                    console.error(`Command IOCON_GET_PIN failed, invalid arguments.`);
                }
            }
            break;
        case AppRunnerCommands.TIMER_SEND_CAPTURE:
            {
                const t_num = toTimerType(parseInt(args[1]));
                const cap_pin = parseInt(args[2]) === 0 ? 0 :
                                parseInt(args[2]) === 1 ? 1 : undefined;
                const rising = args[3] === "RISING" ? true :
                                args[3] === "FALLING" ? false :
                                undefined;
                if(rising === undefined || t_num === undefined || cap_pin === undefined) {
                    console.error(`Command TIMER_SEND_CAPTURE failed, invalid arguments.`);
                } else {
                    TIMER.send_capture(t_num, cap_pin, rising);
                }
            }
            break;
        case AppRunnerCommands.USART_SEND_STR:
            {
                const u_num = toUsartType(parseInt(args[1]));
                if(u_num === undefined || args[2] === undefined) {
                    console.error(`Command USART_SEND_STR failed, invalid arguments.`);
                } else {
                    USART.usart_send_chars(u_num, args[2]);
                }
            }
            break;
        case AppRunnerCommands.LOG:
            log_event_handler && log_event_handler({ text: args[1] });
            break;
        case AppRunnerCommands.START_EXEC:
            qemu.run();
            break;
        default:
            console.error(`Unknown command: ${cmd}`);
            break;
    }
}

export async function execute_commands(file: string, exe_file: string,
        msg_handler: (msg: QemuEventData) => void,
        log_event_handler?: (ev: CustomLogEvent) => void) {
    ReceiverMQ.set_receive_handler(msg_handler);

    let qemu = await start_qemu(exe_file);
    
    SenderMQ.open();
    ReceiverMQ.open();

    let failed = false;
    await new Promise((resolve, reject) => {
        console.log(`Processing file ${exe_file}`);
        fs.readFile(file, async (err, data) => {
            if(err) {
                reject(err);
            }
            let commands = data.toString().split("\n");
            for(let idx in commands) {
                let cmd = commands[idx].trim();
                cmd.replace("\r", "");
                if(!cmd.startsWith("#") && cmd.length !== 0) {
                    try {
                        await execute_command(cmd, qemu, log_event_handler);
                    } catch(err) {
                        console.log("An error occurred while executing code");
                        console.error(err);
                    }
                }
                if(failed) {
                    return;
                }
            }
            qemu.setOnExit(_ => {
                
            });
            SenderMQ.close();
            ReceiverMQ.close();
            qemu.kill();
            resolve();
        });
        qemu.setOnExit(err => {
            failed = true;
            SenderMQ.close();
            ReceiverMQ.close();
            console.log("QEMU closed unexpectedly with error:");
            console.error(err);
            reject(err);
        });
    });

    
}

// default exe: "/run/media/karacasoft/KSYedeks/arm_toolchain/test_program/prog.elf"

