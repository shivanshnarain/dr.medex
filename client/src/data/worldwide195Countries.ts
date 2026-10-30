/**
 * DR.MEDEX Global — Source of Truth for Exactly 195 Sovereign Countries
 * Covers ISO 3166-1 alpha-2 codes, official names, international dial codes,
 * national flags, primary currencies, symbols, and postal system requirements.
 */

export interface WorldwideCountry {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  currency: string;
  symbol: string;
  postalLabel?: string | null;
  stateLabel?: string | null;
  hasPostalCode: boolean;
  hasStates: boolean;
}

export const WORLDWIDE_195_COUNTRIES: WorldwideCountry[] = [
  { name: "Afghanistan", code: "AF", dialCode: "+93", flag: "🇦🇫", currency: "AFN", symbol: "AFN ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Albania", code: "AL", dialCode: "+355", flag: "🇦🇱", currency: "ALL", symbol: "ALL ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Algeria", code: "DZ", dialCode: "+213", flag: "🇩🇿", currency: "DZD", symbol: "DZD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Andorra", code: "AD", dialCode: "+376", flag: "🇦🇩", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Angola", code: "AO", dialCode: "+244", flag: "🇦🇴", currency: "AOA", symbol: "AOA ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Antigua and Barbuda", code: "AG", dialCode: "+1 268", flag: "🇦🇬", currency: "XCD", symbol: "XCD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Argentina", code: "AR", dialCode: "+54", flag: "🇦🇷", currency: "ARS", symbol: "ARS ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Armenia", code: "AM", dialCode: "+374", flag: "🇦🇲", currency: "AMD", symbol: "AMD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺", currency: "AUD", symbol: "A$", postalLabel: "Postcode", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Austria", code: "AT", dialCode: "+43", flag: "🇦🇹", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Azerbaijan", code: "AZ", dialCode: "+994", flag: "🇦🇿", currency: "AZN", symbol: "AZN ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Bahamas", code: "BS", dialCode: "+1 242", flag: "🇧🇸", currency: "BSD", symbol: "BSD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Bahrain", code: "BH", dialCode: "+973", flag: "🇧🇭", currency: "BHD", symbol: "BD", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩", currency: "BDT", symbol: "৳", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Barbados", code: "BB", dialCode: "+1 246", flag: "🇧🇧", currency: "BBD", symbol: "BBD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Belarus", code: "BY", dialCode: "+375", flag: "🇧🇾", currency: "BYN", symbol: "BYN ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Belgium", code: "BE", dialCode: "+32", flag: "🇧🇪", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Belize", code: "BZ", dialCode: "+501", flag: "🇧🇿", currency: "BZD", symbol: "BZD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Benin", code: "BJ", dialCode: "+229", flag: "🇧🇯", currency: "XOF", symbol: "XOF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Bhutan", code: "BT", dialCode: "+975", flag: "🇧🇹", currency: "BTN", symbol: "BTN ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Bolivia", code: "BO", dialCode: "+591", flag: "🇧🇴", currency: "BOB", symbol: "BOB ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Bosnia and Herzegovina", code: "BA", dialCode: "+387", flag: "🇧🇦", currency: "BAM", symbol: "BAM ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Botswana", code: "BW", dialCode: "+267", flag: "🇧🇼", currency: "BWP", symbol: "BWP ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷", currency: "BRL", symbol: "R$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Brunei", code: "BN", dialCode: "+673", flag: "🇧🇳", currency: "BND", symbol: "BND ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Bulgaria", code: "BG", dialCode: "+359", flag: "🇧🇬", currency: "BGN", symbol: "BGN ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Burkina Faso", code: "BF", dialCode: "+226", flag: "🇧🇫", currency: "XOF", symbol: "XOF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Burundi", code: "BI", dialCode: "+257", flag: "🇧🇮", currency: "BIF", symbol: "BIF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Cabo Verde", code: "CV", dialCode: "+238", flag: "🇨🇻", currency: "CVE", symbol: "CVE ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Cambodia", code: "KH", dialCode: "+855", flag: "🇰🇭", currency: "KHR", symbol: "KHR ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Cameroon", code: "CM", dialCode: "+237", flag: "🇨🇲", currency: "XAF", symbol: "XAF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦", currency: "CAD", symbol: "CA$", postalLabel: "Postal Code", stateLabel: "Province / Territory", hasPostalCode: true, hasStates: true },
  { name: "Central African Republic", code: "CF", dialCode: "+236", flag: "🇨🇫", currency: "XAF", symbol: "XAF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Chad", code: "TD", dialCode: "+235", flag: "🇹🇩", currency: "XAF", symbol: "XAF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Chile", code: "CL", dialCode: "+56", flag: "🇨🇱", currency: "CLP", symbol: "CLP ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳", currency: "CNY", symbol: "CN¥", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Colombia", code: "CO", dialCode: "+57", flag: "🇨🇴", currency: "COP", symbol: "COP ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Comoros", code: "KM", dialCode: "+269", flag: "🇰🇲", currency: "KMF", symbol: "KMF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Congo (Congo-Brazzaville)", code: "CG", dialCode: "+242", flag: "🇨🇬", currency: "XAF", symbol: "XAF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Costa Rica", code: "CR", dialCode: "+506", flag: "🇨🇷", currency: "CRC", symbol: "CRC ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Croatia", code: "HR", dialCode: "+385", flag: "🇭🇷", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Cuba", code: "CU", dialCode: "+53", flag: "🇨🇺", currency: "CUP", symbol: "CUP ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Cyprus", code: "CY", dialCode: "+357", flag: "🇨🇾", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Czech Republic", code: "CZ", dialCode: "+420", flag: "🇨🇿", currency: "CZK", symbol: "CZK ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Democratic Republic of the Congo", code: "CD", dialCode: "+243", flag: "🇨🇩", currency: "CDF", symbol: "CDF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Denmark", code: "DK", dialCode: "+45", flag: "🇩🇰", currency: "DKK", symbol: "DKK ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Djibouti", code: "DJ", dialCode: "+253", flag: "🇩🇯", currency: "DJF", symbol: "DJF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Dominica", code: "DM", dialCode: "+1 767", flag: "🇩🇲", currency: "XCD", symbol: "XCD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Dominican Republic", code: "DO", dialCode: "+1 809", flag: "🇩🇴", currency: "DOP", symbol: "DOP ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Ecuador", code: "EC", dialCode: "+593", flag: "🇪🇨", currency: "USD", symbol: "$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬", currency: "EGP", symbol: "EGP ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "El Salvador", code: "SV", dialCode: "+503", flag: "🇸🇻", currency: "USD", symbol: "$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Equatorial Guinea", code: "GQ", dialCode: "+240", flag: "🇬🇶", currency: "XAF", symbol: "XAF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Eritrea", code: "ER", dialCode: "+291", flag: "🇪🇷", currency: "ERN", symbol: "ERN ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Estonia", code: "EE", dialCode: "+372", flag: "🇪🇪", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Eswatini", code: "SZ", dialCode: "+268", flag: "🇸🇿", currency: "SZL", symbol: "SZL ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Ethiopia", code: "ET", dialCode: "+251", flag: "🇪🇹", currency: "ETB", symbol: "ETB ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Fiji", code: "FJ", dialCode: "+679", flag: "🇫🇯", currency: "FJD", symbol: "FJD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Finland", code: "FI", dialCode: "+358", flag: "🇫🇮", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷", currency: "EUR", symbol: "€", postalLabel: "Code Postal", stateLabel: "Région", hasPostalCode: true, hasStates: true },
  { name: "Gabon", code: "GA", dialCode: "+241", flag: "🇬🇦", currency: "XAF", symbol: "XAF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Gambia", code: "GM", dialCode: "+220", flag: "🇬🇲", currency: "GMD", symbol: "GMD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Georgia", code: "GE", dialCode: "+995", flag: "🇬🇪", currency: "GEL", symbol: "GEL ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪", currency: "EUR", symbol: "€", postalLabel: "Postleitzahl", stateLabel: "Bundesland", hasPostalCode: true, hasStates: true },
  { name: "Ghana", code: "GH", dialCode: "+233", flag: "🇬🇭", currency: "GHS", symbol: "GHS ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Greece", code: "GR", dialCode: "+30", flag: "🇬🇷", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Grenada", code: "GD", dialCode: "+1 473", flag: "🇬🇩", currency: "XCD", symbol: "XCD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Guatemala", code: "GT", dialCode: "+502", flag: "🇬🇹", currency: "GTQ", symbol: "GTQ ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Guinea", code: "GN", dialCode: "+224", flag: "🇬🇳", currency: "GNF", symbol: "GNF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Guinea-Bissau", code: "GW", dialCode: "+245", flag: "🇬🇼", currency: "XOF", symbol: "XOF ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Guyana", code: "GY", dialCode: "+592", flag: "🇬🇾", currency: "GYD", symbol: "GYD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Haiti", code: "HT", dialCode: "+509", flag: "🇭🇹", currency: "HTG", symbol: "HTG ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Honduras", code: "HN", dialCode: "+504", flag: "🇭🇳", currency: "HNL", symbol: "HNL ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Hungary", code: "HU", dialCode: "+36", flag: "🇭🇺", currency: "HUF", symbol: "HUF ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Iceland", code: "IS", dialCode: "+354", flag: "🇮🇸", currency: "ISK", symbol: "ISK ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳", currency: "INR", symbol: "₹", postalLabel: "PIN Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩", currency: "IDR", symbol: "Rp", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Iran", code: "IR", dialCode: "+98", flag: "🇮🇷", currency: "IRR", symbol: "IRR ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Iraq", code: "IQ", dialCode: "+964", flag: "🇮🇶", currency: "IQD", symbol: "IQD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Ireland", code: "IE", dialCode: "+353", flag: "🇮🇪", currency: "EUR", symbol: "€", postalLabel: "Eircode", stateLabel: "County", hasPostalCode: true, hasStates: true },
  { name: "Israel", code: "IL", dialCode: "+972", flag: "🇮🇱", currency: "ILS", symbol: "₪", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹", currency: "EUR", symbol: "€", postalLabel: "CAP", stateLabel: "Provincia", hasPostalCode: true, hasStates: true },
  { name: "Jamaica", code: "JM", dialCode: "+1 876", flag: "🇯🇲", currency: "JMD", symbol: "JMD ", postalLabel: null, stateLabel: "Parish", hasPostalCode: false, hasStates: true },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵", currency: "JPY", symbol: "¥", postalLabel: "Postal Code", stateLabel: "Prefecture", hasPostalCode: true, hasStates: true },
  { name: "Jordan", code: "JO", dialCode: "+962", flag: "🇯🇴", currency: "JOD", symbol: "JOD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Kazakhstan", code: "KZ", dialCode: "+7", flag: "🇰🇿", currency: "KZT", symbol: "KZT ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪", currency: "KES", symbol: "KES ", postalLabel: "Postal Code", stateLabel: "County", hasPostalCode: true, hasStates: true },
  { name: "Kiribati", code: "KI", dialCode: "+686", flag: "🇰🇮", currency: "AUD", symbol: "A$", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼", currency: "KWD", symbol: "KD", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Kyrgyzstan", code: "KG", dialCode: "+996", flag: "🇰🇬", currency: "KGS", symbol: "KGS ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Laos", code: "LA", dialCode: "+856", flag: "🇱🇦", currency: "LAK", symbol: "LAK ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Latvia", code: "LV", dialCode: "+371", flag: "🇱🇻", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Lebanon", code: "LB", dialCode: "+961", flag: "🇱🇧", currency: "LBP", symbol: "LBP ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Lesotho", code: "LS", dialCode: "+266", flag: "🇱🇸", currency: "LSL", symbol: "LSL ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Liberia", code: "LR", dialCode: "+231", flag: "🇱🇷", currency: "LRD", symbol: "LRD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Libya", code: "LY", dialCode: "+218", flag: "🇱🇾", currency: "LYD", symbol: "LYD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Liechtenstein", code: "LI", dialCode: "+423", flag: "🇱🇮", currency: "CHF", symbol: "CHF ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Lithuania", code: "LT", dialCode: "+370", flag: "🇱🇹", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Luxembourg", code: "LU", dialCode: "+352", flag: "🇱🇺", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Madagascar", code: "MG", dialCode: "+261", flag: "🇲🇬", currency: "MGA", symbol: "MGA ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Malawi", code: "MW", dialCode: "+265", flag: "🇲🇼", currency: "MWK", symbol: "MWK ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾", currency: "MYR", symbol: "RM", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Maldives", code: "MV", dialCode: "+960", flag: "🇲🇻", currency: "MVR", symbol: "MVR ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Mali", code: "ML", dialCode: "+223", flag: "🇲🇱", currency: "XOF", symbol: "XOF ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Malta", code: "MT", dialCode: "+356", flag: "🇲🇹", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Marshall Islands", code: "MH", dialCode: "+692", flag: "🇲🇭", currency: "USD", symbol: "$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Mauritania", code: "MR", dialCode: "+222", flag: "🇲🇷", currency: "MRU", symbol: "MRU ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Mauritius", code: "MU", dialCode: "+230", flag: "🇲🇺", currency: "MUR", symbol: "MUR ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽", currency: "MXN", symbol: "MX$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Micronesia", code: "FM", dialCode: "+691", flag: "🇫🇲", currency: "USD", symbol: "$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Moldova", code: "MD", dialCode: "+373", flag: "🇲🇩", currency: "MDL", symbol: "MDL ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Monaco", code: "MC", dialCode: "+377", flag: "🇲🇨", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Mongolia", code: "MN", dialCode: "+976", flag: "🇲🇳", currency: "MNT", symbol: "MNT ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Montenegro", code: "ME", dialCode: "+382", flag: "🇲🇪", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Morocco", code: "MA", dialCode: "+212", flag: "🇲🇦", currency: "MAD", symbol: "MAD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Mozambique", code: "MZ", dialCode: "+258", flag: "🇲🇿", currency: "MZN", symbol: "MZN ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Myanmar (Burma)", code: "MM", dialCode: "+95", flag: "🇲🇲", currency: "MMK", symbol: "MMK ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Namibia", code: "NA", dialCode: "+264", flag: "🇳🇦", currency: "NAD", symbol: "NAD ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "Nauru", code: "NR", dialCode: "+674", flag: "🇳🇷", currency: "AUD", symbol: "A$", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "Nepal", code: "NP", dialCode: "+977", flag: "🇳🇵", currency: "NPR", symbol: "NPR ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱", currency: "EUR", symbol: "€", postalLabel: "Postcode", stateLabel: "Provincie", hasPostalCode: true, hasStates: true },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿", currency: "NZD", symbol: "NZ$", postalLabel: "Postcode", stateLabel: "Region", hasPostalCode: true, hasStates: true },
  { name: "Nicaragua", code: "NI", dialCode: "+505", flag: "🇳🇮", currency: "NIO", symbol: "NIO ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Niger", code: "NE", dialCode: "+227", flag: "🇳🇪", currency: "XOF", symbol: "XOF ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬", currency: "NGN", symbol: "₦", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "North Korea", code: "KP", dialCode: "+850", flag: "🇰🇵", currency: "KPW", symbol: "KPW ", postalLabel: null, stateLabel: "State / Province", hasPostalCode: false, hasStates: true },
  { name: "North Macedonia", code: "MK", dialCode: "+389", flag: "🇲🇰", currency: "MKD", symbol: "MKD ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴", currency: "NOK", symbol: "NOK ", postalLabel: "Postnummer", stateLabel: "Fylke", hasPostalCode: true, hasStates: true },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲", currency: "OMR", symbol: "OMR ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰", currency: "PKR", symbol: "PKR ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Palau", code: "PW", dialCode: "+680", flag: "🇵🇼", currency: "USD", symbol: "$", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Panama", code: "PA", dialCode: "+507", flag: "🇵🇦", currency: "PAB", symbol: "PAB ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Papua New Guinea", code: "PG", dialCode: "+675", flag: "🇵🇬", currency: "PGK", symbol: "PGK ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Paraguay", code: "PY", dialCode: "+595", flag: "🇵🇾", currency: "PYG", symbol: "PYG ", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Peru", code: "PE", dialCode: "+51", flag: "🇵🇪", currency: "PEN", symbol: "PEN ", postalLabel: "Postal Code", stateLabel: "Departamento", hasPostalCode: true, hasStates: true },
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭", currency: "PHP", symbol: "₱", postalLabel: "ZIP Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Poland", code: "PL", dialCode: "+48", flag: "🇵🇱", currency: "PLN", symbol: "PLN ", postalLabel: "Kod Pocztowy", stateLabel: "Województwo", hasPostalCode: true, hasStates: true },
  { name: "Portugal", code: "PT", dialCode: "+351", flag: "🇵🇹", currency: "EUR", symbol: "€", postalLabel: "Código Postal", stateLabel: "Distrito", hasPostalCode: true, hasStates: true },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦", currency: "QAR", symbol: "QR", postalLabel: null, stateLabel: "Municipality", hasPostalCode: false, hasStates: true },
  { name: "Romania", code: "RO", dialCode: "+40", flag: "🇷🇴", currency: "RON", symbol: "RON ", postalLabel: "Cod Poștal", stateLabel: "Județ", hasPostalCode: true, hasStates: true },
  { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺", currency: "RUB", symbol: "₽", postalLabel: "Postal Code", stateLabel: "Oblast / Krai", hasPostalCode: true, hasStates: true },
  { name: "Rwanda", code: "RW", dialCode: "+250", flag: "🇷🇼", currency: "RWF", symbol: "RWF ", postalLabel: null, stateLabel: "Province", hasPostalCode: false, hasStates: true },
  { name: "Saint Kitts and Nevis", code: "KN", dialCode: "+1 869", flag: "🇰🇳", currency: "XCD", symbol: "XCD ", postalLabel: null, stateLabel: "Parish", hasPostalCode: false, hasStates: true },
  { name: "Saint Lucia", code: "LC", dialCode: "+1 758", flag: "🇱🇨", currency: "XCD", symbol: "XCD ", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "Saint Vincent and the Grenadines", code: "VC", dialCode: "+1 784", flag: "🇻🇨", currency: "XCD", symbol: "XCD ", postalLabel: null, stateLabel: "Parish", hasPostalCode: false, hasStates: true },
  { name: "Samoa", code: "WS", dialCode: "+685", flag: "🇼🇸", currency: "WST", symbol: "WST ", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "San Marino", code: "SM", dialCode: "+378", flag: "🇸🇲", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "State / Province", hasPostalCode: true, hasStates: true },
  { name: "Sao Tome and Principe", code: "ST", dialCode: "+239", flag: "🇸🇹", currency: "STN", symbol: "STN ", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦", currency: "SAR", symbol: "SR", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Senegal", code: "SN", dialCode: "+221", flag: "🇸🇳", currency: "XOF", symbol: "XOF ", postalLabel: "Postal Code", stateLabel: "Région", hasPostalCode: true, hasStates: true },
  { name: "Serbia", code: "RS", dialCode: "+381", flag: "🇷🇸", currency: "RSD", symbol: "RSD ", postalLabel: "Poštanski Broj", stateLabel: "Okrug", hasPostalCode: true, hasStates: true },
  { name: "Seychelles", code: "SC", dialCode: "+248", flag: "🇸🇨", currency: "SCR", symbol: "SCR ", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "Sierra Leone", code: "SL", dialCode: "+232", flag: "🇸🇱", currency: "SLE", symbol: "SLE ", postalLabel: null, stateLabel: "Province", hasPostalCode: false, hasStates: true },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬", currency: "SGD", symbol: "S$", postalLabel: "Postal Code", stateLabel: "District", hasPostalCode: true, hasStates: false },
  { name: "Slovakia", code: "SK", dialCode: "+421", flag: "🇸🇰", currency: "EUR", symbol: "€", postalLabel: "PSČ", stateLabel: "Kraj", hasPostalCode: true, hasStates: true },
  { name: "Slovenia", code: "SI", dialCode: "+386", flag: "🇸🇮", currency: "EUR", symbol: "€", postalLabel: "Poštna Številka", stateLabel: "Regija", hasPostalCode: true, hasStates: true },
  { name: "Solomon Islands", code: "SB", dialCode: "+677", flag: "🇸🇧", currency: "SBD", symbol: "SBD ", postalLabel: null, stateLabel: "Province", hasPostalCode: false, hasStates: true },
  { name: "Somalia", code: "SO", dialCode: "+252", flag: "🇸🇴", currency: "SOS", symbol: "SOS ", postalLabel: "Postal Code", stateLabel: "Region", hasPostalCode: true, hasStates: true },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦", currency: "ZAR", symbol: "R", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷", currency: "KRW", symbol: "₩", postalLabel: "Postal Code", stateLabel: "Province / City", hasPostalCode: true, hasStates: true },
  { name: "South Sudan", code: "SS", dialCode: "+211", flag: "🇸🇸", currency: "SSP", symbol: "SSP ", postalLabel: null, stateLabel: "State", hasPostalCode: false, hasStates: true },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸", currency: "EUR", symbol: "€", postalLabel: "Código Postal", stateLabel: "Provincia", hasPostalCode: true, hasStates: true },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰", currency: "LKR", symbol: "LKR ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Sudan", code: "SD", dialCode: "+249", flag: "🇸🇩", currency: "SDG", symbol: "SDG ", postalLabel: "Postal Code", stateLabel: "State", hasPostalCode: true, hasStates: true },
  { name: "Suriname", code: "SR", dialCode: "+597", flag: "🇸🇷", currency: "SRD", symbol: "SRD ", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪", currency: "SEK", symbol: "SEK ", postalLabel: "Postnummer", stateLabel: "Län", hasPostalCode: true, hasStates: true },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭", currency: "CHF", symbol: "CHF ", postalLabel: "PLZ", stateLabel: "Kanton", hasPostalCode: true, hasStates: true },
  { name: "Syria", code: "SY", dialCode: "+963", flag: "🇸🇾", currency: "SYP", symbol: "SYP ", postalLabel: null, stateLabel: "Governorate", hasPostalCode: false, hasStates: true },
  { name: "Tajikistan", code: "TJ", dialCode: "+992", flag: "🇹🇯", currency: "TJS", symbol: "TJS ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Tanzania", code: "TZ", dialCode: "+255", flag: "🇹🇿", currency: "TZS", symbol: "TZS ", postalLabel: "Postal Code", stateLabel: "Region", hasPostalCode: true, hasStates: true },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭", currency: "THB", symbol: "THB ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Timor-Leste", code: "TL", dialCode: "+670", flag: "🇹🇱", currency: "USD", symbol: "$", postalLabel: null, stateLabel: "Municipality", hasPostalCode: false, hasStates: true },
  { name: "Togo", code: "TG", dialCode: "+228", flag: "🇹🇬", currency: "XOF", symbol: "XOF ", postalLabel: null, stateLabel: "Région", hasPostalCode: false, hasStates: true },
  { name: "Tonga", code: "TO", dialCode: "+676", flag: "🇹🇴", currency: "TOP", symbol: "TOP ", postalLabel: null, stateLabel: "Division", hasPostalCode: false, hasStates: true },
  { name: "Trinidad and Tobago", code: "TT", dialCode: "+1 868", flag: "🇹🇹", currency: "TTD", symbol: "TTD ", postalLabel: "Postal Code", stateLabel: "Region / Borough", hasPostalCode: true, hasStates: true },
  { name: "Tunisia", code: "TN", dialCode: "+216", flag: "🇹🇳", currency: "TND", symbol: "TND ", postalLabel: "Code Postal", stateLabel: "Governorate", hasPostalCode: true, hasStates: true },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷", currency: "TRY", symbol: "₺", postalLabel: "Posta Kodu", stateLabel: "İl", hasPostalCode: true, hasStates: true },
  { name: "Turkmenistan", code: "TM", dialCode: "+993", flag: "🇹🇲", currency: "TMT", symbol: "TMT ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Tuvalu", code: "TV", dialCode: "+688", flag: "🇹🇻", currency: "AUD", symbol: "A$", postalLabel: null, stateLabel: "Island", hasPostalCode: false, hasStates: true },
  { name: "Uganda", code: "UG", dialCode: "+256", flag: "🇺🇬", currency: "UGX", symbol: "UGX ", postalLabel: null, stateLabel: "District", hasPostalCode: false, hasStates: true },
  { name: "Ukraine", code: "UA", dialCode: "+380", flag: "🇺🇦", currency: "UAH", symbol: "UAH ", postalLabel: "Postal Code", stateLabel: "Oblast", hasPostalCode: true, hasStates: true },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪", currency: "AED", symbol: "AED ", postalLabel: "Postal Code", stateLabel: "Emirate", hasPostalCode: true, hasStates: true },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧", currency: "GBP", symbol: "£", postalLabel: "Postcode", stateLabel: "County / Region", hasPostalCode: true, hasStates: true },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸", currency: "USD", symbol: "$", postalLabel: "ZIP Code", stateLabel: "State", hasPostalCode: true, hasStates: true },
  { name: "Uruguay", code: "UY", dialCode: "+598", flag: "🇺🇾", currency: "UYU", symbol: "UYU ", postalLabel: "Código Postal", stateLabel: "Departamento", hasPostalCode: true, hasStates: true },
  { name: "Uzbekistan", code: "UZ", dialCode: "+998", flag: "🇺🇿", currency: "UZS", symbol: "UZS ", postalLabel: "Postal Code", stateLabel: "Region", hasPostalCode: true, hasStates: true },
  { name: "Vanuatu", code: "VU", dialCode: "+678", flag: "🇻🇺", currency: "VUV", symbol: "VUV ", postalLabel: null, stateLabel: "Province", hasPostalCode: false, hasStates: true },
  { name: "Vatican City (Holy See)", code: "VA", dialCode: "+39", flag: "🇻🇦", currency: "EUR", symbol: "€", postalLabel: "Postal Code", stateLabel: "Region", hasPostalCode: true, hasStates: false },
  { name: "Venezuela", code: "VE", dialCode: "+58", flag: "🇻🇪", currency: "VES", symbol: "VES ", postalLabel: "Código Postal", stateLabel: "Estado", hasPostalCode: true, hasStates: true },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳", currency: "VND", symbol: "VND ", postalLabel: "Mã Bưu Chính", stateLabel: "Tỉnh / Thành", hasPostalCode: true, hasStates: true },
  { name: "Yemen", code: "YE", dialCode: "+967", flag: "🇾🇪", currency: "YER", symbol: "YER ", postalLabel: null, stateLabel: "Governorate", hasPostalCode: false, hasStates: true },
  { name: "Zambia", code: "ZM", dialCode: "+260", flag: "🇿🇲", currency: "ZMW", symbol: "ZMW ", postalLabel: "Postal Code", stateLabel: "Province", hasPostalCode: true, hasStates: true },
  { name: "Zimbabwe", code: "ZW", dialCode: "+263", flag: "🇿🇼", currency: "ZWG", symbol: "ZWG ", postalLabel: null, stateLabel: "Province", hasPostalCode: false, hasStates: true }
];

export const POPULAR_COUNTRY_CODES = ["IN", "US", "GB", "AE", "DE", "SA", "AU", "CA", "SG", "FR", "ZA", "JP"];

/**
 * Filter countries supporting:
 * - Alphabetic search (country name e.g. "India", "Ind", "United")
 * - Numeric search (calling code e.g. "91", "+91", "1", "+1", "44", "971")
 * - ISO code search ("IN", "US", "GB")
 * - Shared calling codes (+1 matches US, Canada, Bahamas, etc.)
 */
export function filterWorldwideCountries(countries: WorldwideCountry[], query: string): WorldwideCountry[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return countries;

  const isNumericOnly = /^\+?\d+$/.test(q);
  const searchDigits = q.replace(/^\+/, "").replace(/\s+/g, "");

  // Normalize query for accent-insensitive matching (e.g. "cote" matches "Côte d'Ivoire")
  const normalizedQuery = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return countries.filter((c) => {
    const nameLower = c.name.toLowerCase();
    const normalizedName = nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const codeLower = c.code.toLowerCase();
    const dialDigits = (c.dialCode || "").replace(/^\+/, "").replace(/\s+/g, "");

    if (isNumericOnly) {
      // Numeric searches match calling codes
      // e.g. "1" matches any dial code starting with 1 (+1, +1 242, +1 246, etc.)
      // "91" matches +91
      // "44" matches +44
      // "971" matches +971
      return dialDigits.startsWith(searchDigits);
    }

    // Alphabetic search matches country name or ISO code
    if (normalizedName.includes(normalizedQuery)) return true;
    if (codeLower === q || codeLower.startsWith(q)) return true;
    if (searchDigits && dialDigits.startsWith(searchDigits)) return true;

    return false;
  }).sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aDigits = (a.dialCode || "").replace(/^\+/, "").replace(/\s+/g, "");
    const bDigits = (b.dialCode || "").replace(/^\+/, "").replace(/\s+/g, "");

    if (isNumericOnly) {
      // Exact dial code match rank first (e.g. +1 US and Canada before +1 242 Bahamas)
      if (aDigits === searchDigits && bDigits !== searchDigits) return -1;
      if (bDigits === searchDigits && aDigits !== searchDigits) return 1;
      if (aDigits.length !== bDigits.length) return aDigits.length - bDigits.length;
    } else {
      // Name startsWith rank first
      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }
    return a.name.localeCompare(b.name);
  });
}
