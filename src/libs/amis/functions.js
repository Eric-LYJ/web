import utils from "utils";
import {registerFunction} from 'amis';

registerFunction('NUMBERADD', (...args) => utils.add.apply(utils, args));
registerFunction('NUMBERSUB', (...args) => utils.sub.apply(utils, args));
registerFunction('NUMBERMUL', (...args) => utils.mul.apply(utils, args));
registerFunction('NUMBERDIV', (...args) => utils.div.apply(utils, args));