// Format validation only. Live delivery eligibility must be checked against
// merchant-configured zones independently of the postal-code format.
export const PINCODE_PATTERN = '[1-9][0-9]{5}';
export const PINCODE_REGEX = new RegExp(`^${PINCODE_PATTERN}$`);
export const PINCODE_HINT = 'Enter a six-digit Indian pincode, for example 192210';
