import { prisma } from "@applyai/db";
export async function makeInActive(internshipId: string) {
  await prisma.unstop_internships.update({
    where: {
      id: internshipId,
    },
    data: {
      isActive: false,
    },
  });
}

