import Link from "next/link";
import { Compass } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface CategoryDesign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  preview_url?: string;
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  // Fetch category info
  const { data: categoryRec } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug")
    .ilike("slug", category)
    .limit(1)
    .single();

  // Fetch components in this category
  const { data: designs } = categoryRec
    ? await supabaseAdmin
        .from("components")
        .select("id, name, slug, description, preview_url")
        .in("status", ["posted", "featured"])
        .order("created_at", { ascending: false })
    : { data: [] as CategoryDesign[] };

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col gap-2 mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold capitalize text-foreground">{categoryRec?.name || category} Gallery</h1>
        <p className="text-muted-foreground text-sm">Components uploaded directly from the Admin Portal.</p>
      </div>

      {!designs || designs.length === 0 ? (
        <p className="text-muted-foreground">No components found for this category.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {(designs as unknown as CategoryDesign[]).map((design) => (
             <Link 
               key={design.id}
               href={`/components/detail/${design.id}`}
               className="group border border-border bg-card rounded-xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col"
             >
               <div className="w-full h-48 bg-zinc-900 border-b border-border flex items-center justify-center relative overflow-hidden">
                 {design.preview_url ? (
                   /* eslint-disable-next-line @next/next/no-img-element */
                   <img src={design.preview_url} alt={design.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                 ) : (
                   <Compass className="w-10 h-10 text-muted-foreground" />
                 )}
               </div>
               <div className="p-6">
                 <h3 className="font-medium text-foreground text-lg mb-1">{design.name}</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                   {design.description}
                 </p>
                 <p className="text-sm font-semibold mt-4 text-primary opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                   Open Component details &rarr;
                 </p>
               </div>
             </Link>
           ))}
        </div>
      )}
    </div>
  );
}
