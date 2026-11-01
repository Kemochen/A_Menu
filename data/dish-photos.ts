import type { Recipe } from "./recipes";

export const dishPhotos: Record<string, string> = Object.fromEntries([
  "fanqie_niunan", "yuxiang_rousi", "qingchao_jielan", "xiaren_xilanhua",
  "suanrong_xilanhua", "hongshao_paigu", "lachang_menfan", "shantang_wawacai",
  "xiangjian_sanwenyu", "ladun_jikuai", "baicai_dunxia", "huamei_xiaopai",
  "lengmian", "gedatang", "aoerliang_kaochi", "qiukui_niurouli",
  "donggua_rouwantang", "rouwan_yimian", "luroufan", "woju_chaorou",
  "qiukui_shanbeizhu", "sanzhi_menguo", "donggua_gala", "jianmen_doufu",
  "niunan_gali", "jiurou_gali", "qinghuajiao_niuwa", "hanshi_banfan",
  "mapo_doufu", "heihujiao_niuliu", "jiaogua_chaorou", "lianou_paigutang",
  "xihongshi_chaodan", "niupai_yimian", "qingzheng_xueyu", "gyudon",
  "suanrong_acai", "jungu_jitang", "sanwenyu_yimian", "baicai_duntofu",
  "roumo_doujiao", "kao_caihua", "hongshao_niunan", "xingbaogu_niurou",
  "loco_moco", "luobo_dunxia", "lusun_xiaren", "huangmen_ji",
  "kele_jichi", "hanshi_paigutang", "shanyao_dunniunan", "qincai_niurou",
  "gali_zhupaifan", "qingdun_yangtang", "suancaiyu", "sanxian_tang",
  "koumo_jituirou", "shanyao_yumi_paigu", "sanwenyu_menfan", "qingjiao_niurou",
  "qingchao_tonghao", "mala_ganguo", "paigu_mifan", "zhuzhou_fan",
  "youcai_xianggu", "yundousi_roumo", "suantai_chaorou", "shanbei_jungu_menfan",
  "shouzhuafan", "qingchao_caixin", "ziran_yangcong_niurou", "yutou_niuleitiao",
  "jiaogua_jidan_xiaren", "xiaolongxia", "yishi_sanmingzhi", "jiangxiangbing",
  "meiguo_basike", "danta", "yanduxian"
].map((id) => [id, `/dishes/photos/${id}.webp`]));

export function getDishImage(recipe: Pick<Recipe, "id" | "image">) {
  // Older NAS versions may still return bundled category images.
  return recipe.image.startsWith("/dishes/categories/")
    ? dishPhotos[recipe.id] ?? recipe.image
    : recipe.image;
}
