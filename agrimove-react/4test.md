# AgriMove — Test Scenarios

## Auth Tests
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Signup success | Fill valid form, submit | Redirected to driver list, user shown in header |
| 2 | Signup duplicate email | Use existing email | Error message shown |
| 3 | Login success | Enter valid credentials | Redirected to driver list |
| 4 | Login wrong password | Enter wrong password | Error message shown |
| 5 | Logout | Click logout | Returned to login page |
| 6 | Protected booking | Try to book without login | Redirected to login |
| 7 | Auth persistence | Login, refresh page | Still logged in |

## UI Tests
| # | Scenario | Expected |
|---|----------|----------|
| 8 | Header renders with gradient | Gradient visible, not flat color |
| 9 | Cards have hover animation | Scale + shadow on hover |
| 10 | Mobile responsive | Cards stack, header collapses |
| 11 | Filter bar works | Filters drivers correctly |
| 12 | Loading state shows spinner | Animated loader visible during fetch |
