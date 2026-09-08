import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CategoryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CategoryView[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      iconKey: r.iconKey,
    }));
  }

  async findBySlug(slug: string): Promise<CategoryView> {
    const row = await this.prisma.category.findUnique({ where: { slug } });
    if (!row) {
      throw new NotFoundException('category_not_found');
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      iconKey: row.iconKey,
    };
  }
}
