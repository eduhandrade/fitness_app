/** Bluetooth GATT UUIDs and opcodes for the Fitness Machine Service (FTMS)
 * and the standard Heart Rate Service, per the Bluetooth SIG specs. */

export const FTMS_SERVICE = 0x1826;
export const HEART_RATE_SERVICE = 0x180d;

export const INDOOR_BIKE_DATA_CHARACTERISTIC = 0x2ad2;
export const FITNESS_MACHINE_CONTROL_POINT_CHARACTERISTIC = 0x2ad9;
export const FITNESS_MACHINE_FEATURE_CHARACTERISTIC = 0x2acc;
export const FITNESS_MACHINE_STATUS_CHARACTERISTIC = 0x2ada;
export const HEART_RATE_MEASUREMENT_CHARACTERISTIC = 0x2a37;

/** Fitness Machine Control Point op codes. */
export const OPCODE_REQUEST_CONTROL = 0x00;
export const OPCODE_RESET = 0x01;
export const OPCODE_SET_TARGET_POWER = 0x05;
export const OPCODE_START_OR_RESUME = 0x07;
export const OPCODE_STOP_OR_PAUSE = 0x08;
export const OPCODE_SET_INDOOR_BIKE_SIMULATION_PARAMETERS = 0x11;
export const OPCODE_RESPONSE_CODE = 0x80;

/** Control Point response result codes. */
export const RESULT_SUCCESS = 0x01;
