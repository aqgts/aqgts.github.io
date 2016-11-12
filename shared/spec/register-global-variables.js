import lodash from "lodash";
import {TextEncoder, TextDecoder} from "text-encoding";
import "setimmediate";

global._ = lodash;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
