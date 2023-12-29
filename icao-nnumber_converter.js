const ICAO_SIZE = 6;           // size of an icao address
const NNUMBER_MAX_SIZE = 6;    // max size of a N-Number

const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // alphabet without I and O
const digitset = "0123456789";
const hexset = "0123456789ABCDEF";
const allchars = charset+digitset;

const suffix_size = 1 + charset.length * (1 + charset.length);         // 601
const bucket4_size = 1 + charset.length + digitset.length;             // 35
const bucket3_size = digitset.length*bucket4_size + suffix_size;     // 951
const bucket2_size = digitset.length*(bucket3_size) + suffix_size;   // 10111
const bucket1_size = digitset.length*(bucket2_size) + suffix_size;


function get_suffix(offset) {
    /*
    Compute the suffix for the tail number given an offset
    offset < suffix_size
    An offset of 0 returns in a valid emtpy suffix
    A non-zero offset return a string containing one or two character from 'charset'
    Reverse function of suffix_shift()
    0 -> ''
    1 -> 'A'
    2 -> 'AA'
    3 -> 'AB'
    4 -> 'AC'
    ...
    24 -> 'AZ'
    25 -> 'B'
    26 -> 'BA'
    27 -> 'BB'
    ...
    600 -> 'ZZ'
    */
    if (offset == 0) {
        return '';
    }
    var char0 = charset[Math.floor((offset - 1) / (charset.length + 1))];
    var rem = (offset - 1) % (charset.length + 1);
    if (rem == 0) {
        return char0;
    }
    return char0 + charset[rem - 1];
}


function suffix_offset(s) {
    /*
    Compute the offset corresponding to the given alphabetical suffix
    Reverse function of get_suffix()
    ''   -> 0
    'A'  -> 1
    'AA' -> 2
    'AB' -> 3
    'AC' -> 4
    ...
    'AZ' -> 24
    'B'  -> 25
    'BA' -> 26
    'BB' -> 27
    ...
    'ZZ' -> 600
    */
    if (s.length == 0) {
        return 0;
    }
    var valid = true;
    if (s.length > 2) {
        valid = false;
    } else {
        for (var i = 0; i < s.length; i++) {
            if (!charset.includes(s[i])) {
                valid = false;
                break;
            }
        }
    }

    if (!valid) {
        console.log("parameter of suffix_shift() invalid");
        console.log(s);
        return null;
    }

    var count = (charset.length + 1) * charset.indexOf(s[0]) + 1;
    if (s.length == 2) {
        count += charset.indexOf(s[1]) + 1;
    }
    return count;
}


function create_icao(prefix, i) {
    /*
    Creates an american icao number composed from the prefix ('a' for USA)
    and from the given number i
    The output is an hexadecimal of length 6 starting with the suffix
    Example: create_icao('a', 11) -> "a0000b"
    */
    var suffix = i.toString(16);
    var l = prefix.length + suffix.length;
    if (l > ICAO_SIZE) {
        return null;
    }
    return prefix + '0'.repeat(ICAO_SIZE - l) + suffix;
}


function n_to_icao(nnumber) {
    /*
    Convert a Tail Number (N-Number) to the corresponding ICAO address
    Only works with US registrations (ICAOS starting with 'a' and tail number starting with 'N')
    Return null for invalid parameter
    Return the ICAO address associated with the given N-Number in string format on success
    */

    // check parameter validity
    var valid = true;
    // verify that tail number has length <=6 and starts with 'N'
    if (!(0 < nnumber.length <= NNUMBER_MAX_SIZE) || nnumber[0] != 'N') {
        valid = false;
    } else {
        // verify the alphabet of the tail number
        for (var i = 0; i < nnumber.length; i++) {
            if (!allchars.includes(nnumber[i])) {
                valid = false;
                break;
            }
        }
        // verify that the tail number has a correct format (single suffix at the end of string)
        if (valid && nnumber.length > 3) {
            for (var i = 1; i < nnumber.length - 2; i++) {
                if (charset.includes(nnumber[i])) {
                    valid = false;
                    break;
                }
            }
        }
    }

    if (!valid) {
        return null;
    }

    var prefix = 'a';
    var count = 0;

    if (nnumber.length > 1) {
        nnumber = nnumber.substring(1);
        count += 1;
        for (var i = 0; i < nnumber.length; i++) {
            if (i == NNUMBER_MAX_SIZE - 2) { // NNUMBER_MAX_SIZE-2 = 4
                // last possible char (in allchars)
                count += allchars.indexOf(nnumber[i]) + 1;
            } else if (charset.includes(nnumber[i])) {
                // first alphabetical char
                count += suffix_offset(nnumber.substring(i));
                break; // nothing comes after alphabetical chars
            } else {
                // number
                if (i == 0) {
                    count += (parseInt(nnumber[i]) - 1) * bucket1_size;
                } else if (i == 1) {
                    count += parseInt(nnumber[i]) * bucket2_size + suffix_size;
                } else if (i == 2) {
                    count += parseInt(nnumber[i]) * bucket3_size + suffix_size;
                } else if (i == 3) {
                    count += parseInt(nnumber[i]) * bucket4_size + suffix_size;
                }
            }
        }
    }
    return create_icao(prefix, count);
}


function icao_to_n(icao) {
    /*
    Convert an ICAO address to its associated tail number (N-Number)
    Only works with US registrations (ICAOS starting with 'a' and tail number starting with 'N')
    Return null for invalid parameter
    Return the tail number associated with the given ICAO in string format on success
    */

    // check parameter validity
    icao = icao.toUpperCase();
    var valid = true;
    if (icao.length != ICAO_SIZE || icao[0] != 'A') {
        valid = false;
    } else {
        for (var i = 0; i < icao.length; i++) {
            if (!hexset.includes(icao[i])) {
                valid = false;
                break;
            }
        }
    }

    // return null for invalid parameter
    if (!valid) {
        return null;
    }

    var output = 'N'; // digit 0 = N

    var i = parseInt(icao.substring(1), 16) - 1; // parse icao to int
    if (i < 0) {
        return output;
    }

    var dig1 = Math.floor(i / bucket1_size) + 1; // digit 1
    var rem1 = i % bucket1_size;
    output += dig1.toString();

    if (rem1 < suffix_size) {
        return output + get_suffix(rem1);
    }

    rem1 -= suffix_size; // shift for digit 2
    var dig2 = Math.floor(rem1 / bucket2_size);
    var rem2 = rem1 % bucket2_size;
    output += dig2.toString();

    if (rem2 < suffix_size) {
        return output + get_suffix(rem2);
    }

    rem2 -= suffix_size; // shift for digit 3
    var dig3 = Math.floor(rem2 / bucket3_size);
    var rem3 = rem2 % bucket3_size;
    output += dig3.toString();

    if (rem3 < suffix_size) {
        return output + get_suffix(rem3);
    }

    rem3 -= suffix_size; // shift for digit 4
    var dig4 = Math.floor(rem3 / bucket4_size);
    var rem4 = rem3 % bucket4_size;
    output += dig4.toString();

    if (rem4 == 0) {
        return output;
    }

    // find last character
    return output + allchars[rem4 - 1];
}
