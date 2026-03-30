import { Organization, OrganizationMember } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        emailVerified: boolean;
      };
      org?: Organization;
      membership?: OrganizationMember;
    }
  }
}
