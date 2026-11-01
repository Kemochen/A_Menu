import { NextResponse } from "next/server";
import { recipes } from "@/data/recipes";
import { recipeStore } from "@/lib/recipe-store.mjs";
import { normalizeRecipeInput } from "@/lib/recipe-input.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ recipes: await recipeStore.list(recipes) });
  } catch {
    return NextResponse.json({ error: "读取菜品库失败，请检查服务器存储。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
    normalizeRecipeInput(input);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "菜品格式不正确。" }, { status: 400 });
  }
  try {
    const recipe = await recipeStore.add(input, recipes);
    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "这道菜已经存在，请换一个名称。") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "保存菜品失败，请检查服务器存储后重试。" }, { status: 500 });
  }
}
