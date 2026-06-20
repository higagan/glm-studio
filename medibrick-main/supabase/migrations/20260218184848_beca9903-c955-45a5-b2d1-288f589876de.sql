UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE email IN (
  'priya.sharma@testdoc.com',
  'arjun.mehta@testdoc.com',
  'neha.kapoor@testdoc.com',
  'rahul.verma@testdoc.com',
  'sunita.rao@testdoc.com'
);
