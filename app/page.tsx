import { MenuApp } from "@/components/MenuApp";
import { recipes } from "@/data/recipes";

export default function Home() {
  return <MenuApp recipes={recipes} />;
}
