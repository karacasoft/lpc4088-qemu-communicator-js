import SenderMQ, { GPIO, IOCON, TIMER, USART } from '../sender';
import ReceiverMQ from '../receiver';
import { QemuMessage, toPinType, toPortType, toTimerType, toUsartType } from '../qemu_mq_types';
import fs from 'fs';
import { GPIO_RECEIVED_MESSAGE_CODES, IOCON_RECEIVED_MESSAGE_CODES, MAGIC_NUMBERS, TIMER_RECEIVED_MESSAGE_CODES, USART_RECEIVED_MESSAGE_CODES } from '../constants';
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
}

const log_file_fd = fs.openSync("log.txt", 'w');

const keypress = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
    }))
};

function handler(msg: QemuMessage) {
    if(MAGIC_NUMBERS[msg.magic] === "GPIO") {
        if(GPIO_RECEIVED_MESSAGE_CODES[msg.cmd] === "status") {
            let gpio_status_dir = `${Date.now()} GPIO DIR${String.fromCharCode(msg.arg1)} 0x${msg.arg2.toString(16)}\n`;
            let gpio_status_mask = `${Date.now()} GPIO MASK${String.fromCharCode(msg.arg1)} 0x${msg.arg3.toString(16)}\n`;
            let gpio_status_pin = `${Date.now()} GPIO PIN${String.fromCharCode(msg.arg1)} 0x${msg.arg4.toString(16)}\n`;
            fs.writeSync(log_file_fd, gpio_status_dir);
            fs.writeSync(log_file_fd, gpio_status_mask);
            fs.writeSync(log_file_fd, gpio_status_pin);
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "IOCON") {
        if(IOCON_RECEIVED_MESSAGE_CODES[msg.cmd] === "pin_status") {
            let iocon_pin_status = `${Date.now()} IOCON ${String.fromCharCode(msg.arg1)} ${msg.arg2} 0x${msg.arg3.toString(16)}\n`;
            fs.writeSync(log_file_fd, iocon_pin_status);
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "TIMER") {
        if(TIMER_RECEIVED_MESSAGE_CODES[msg.cmd] === "reg_status") {
            let timer_reg_status = `${Date.now()} TIMER${String.fromCharCode(msg.arg1)} ${msg.arg2} 0x${msg.arg3.toString(16)}\n`;
            fs.writeSync(log_file_fd, timer_reg_status);
        }
    } else if(MAGIC_NUMBERS[msg.magic] === "USART") {
        if(USART_RECEIVED_MESSAGE_CODES[msg.cmd] === "char") {
            let usart_received_char = `${Date.now()} USART${String.fromCharCode(msg.arg1)} ${String.fromCharCode(msg.arg2)}`;
            fs.writeSync(log_file_fd, usart_received_char);
        }
    }
}

async function sleep(ms: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve(); }, ms);
    });
}

async function execute_command(cmd: string, qemu: QemuProcessInterface) {
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
        case AppRunnerCommands.START_EXEC:
            qemu.run();
            break;
        default:
            console.error(`Unknown command: ${cmd}`);
            break;
    }
}

async function execute_commands(file: string) {
    ReceiverMQ.set_receive_handler(handler);

    let qemu = await start_qemu("/run/media/karacasoft/KSYedeks/arm_toolchain/test_program/prog.elf");
    
    SenderMQ.open();
    ReceiverMQ.open();

    await new Promise((resolve, reject) => {
        fs.readFile(file, async (err, data) => {
            if(err) {
                reject(err);
            }
            let commands = data.toString().split("\n");
            for(let idx in commands) {
                let cmd = commands[idx]
                await execute_command(cmd, qemu);
            }
            
            fs.closeSync(log_file_fd);
            qemu.kill();
            resolve();
        });
        qemu.setOnExit(err => {
            console.log("QEMU closed unexpectedly with error:");
            console.error(err);
            reject(err);
        });
    });

    
}

execute_commands("testfile.txt").then(_ => {
    exit(0);
}, err => {
    console.error(err);
    exit(1);
});
