import lodash from "lodash";
import {TextEncoder, TextDecoder} from "text-encoding";

global._ = lodash;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
