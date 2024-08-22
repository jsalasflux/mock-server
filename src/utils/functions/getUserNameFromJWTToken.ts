export function getUserNameFromJWTToken(token: string) {
  return token.split(' ')[1].split('-')[0].toLowerCase();
}
