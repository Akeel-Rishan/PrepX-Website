export const PUBLIC_ORGANIZATION_NAME =
  process.env.NEXT_PUBLIC_APP_ORGANIZATION?.trim() || 'Undergraduate Society of Mawanella';

export const PUBLIC_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'ugsmaw@gmail.com';

export const PUBLIC_SUPPORT_CONTACT = `${PUBLIC_ORGANIZATION_NAME} at ${PUBLIC_SUPPORT_EMAIL}`;
