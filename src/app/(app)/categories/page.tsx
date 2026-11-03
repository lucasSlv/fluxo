import { requireUser } from "@/modules/auth/dal";
import { listCategories } from "@/modules/categories/service";
import { PageHeader } from "@/components/ui/page-header";
import { serialize } from "@/lib/utils";
import { CategoriesView } from "./_components/categories-view";

export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await listCategories(user.id);
  return (
    <>
      <PageHeader title="Categorias" description="Organize receitas e despesas em categorias e subcategorias." />
      <CategoriesView categories={serialize(categories)} />
    </>
  );
}
