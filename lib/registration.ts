export function isRegistrationEnabled(): boolean {
  const flag = process.env.REGISTRATION_ENABLED;
  if (flag === undefined) return true;
  return flag === "1" || flag.toLowerCase() === "true";
}

export function isInviteCodeValid(code: string | undefined): boolean {
  const required = process.env.REGISTRATION_INVITE_CODE;
  if (!required) return true;
  return code === required;
}
