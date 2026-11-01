import { dishPhotos } from "./dish-photos";

export type WeatherSuitability = "cold" | "hot" | "both";

export type Recipe = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  weather: WeatherSuitability;
  image: string;
  ingredients: string[];
  ingredientTypes: Record<string, string>;
  initialLastEatenDaysAgo?: number;
};

export const weatherSymbols: Record<WeatherSuitability, string> = {
  cold: "\u2744\uFE0F",
  hot: "\u2600\uFE0F",
  both: "\uD83C\uDF24\uFE0F"
};

export const weatherLabels: Record<WeatherSuitability, string> = {
  cold: "适合冷天",
  hot: "适合热天",
  both: "冷热都适合"
};

const recipeLibrary: Recipe[] = [
  {
    id: "fanqie_niunan",
    name: "番茄牛腩",
    category: "肉类",
    tags: ["牛肉","炖菜","适合天冷","肉菜","番茄","炖煮"],
    weather: "cold",
    image: "/dishes/categories/meat.svg",
    ingredients: ["牛腩","番茄","洋葱"],
    ingredientTypes: {"牛腩":"肉类","番茄":"蔬菜","洋葱":"蔬菜"}
  },
  {
    id: "ladun_jikuai",
    name: "辣炖鸡块",
    category: "肉类",
    tags: ["鸡肉","炖菜","适合天冷","肉菜","辣味","炖煮"],
    weather: "cold",
    image: "/dishes/categories/meat.svg",
    ingredients: ["鸡腿肉","胡萝卜","土豆","韩国辣酱"],
    ingredientTypes: {"鸡腿肉":"肉类","胡萝卜":"蔬菜","土豆":"蔬菜","韩国辣酱":"调料"}
  },
  {
    id: "luroufan",
    name: "卤肉饭",
    category: "肉类",
    tags: ["猪肉","不辣","下饭菜","肉菜","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["五花肉","红葱头/洋葱"],
    ingredientTypes: {"五花肉":"肉类","红葱头/洋葱":"蔬菜"}
  },
  {
    id: "yuxiang_rousi",
    name: "鱼香肉丝",
    category: "家常菜",
    tags: ["猪肉","微辣","下饭菜","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["里脊肉","胡萝卜","木耳","青椒/芸豆丝","郫县豆瓣"],
    ingredientTypes: {"里脊肉":"肉类","胡萝卜":"蔬菜","木耳":"蔬菜","青椒/芸豆丝":"蔬菜","郫县豆瓣":"调料"}
  },
  {
    id: "qingchao_jielan",
    name: "清炒芥兰",
    category: "素菜",
    tags: ["清淡","素菜","蒜香","快手","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["芥兰","蒜蓉"],
    ingredientTypes: {"芥兰":"蔬菜","蒜蓉":"调料"}
  },
  {
    id: "xiaren_xilanhua",
    name: "西兰花虾仁",
    category: "海鲜类",
    tags: ["虾仁","清淡","海鲜","虾","四季"],
    weather: "both",
    image: "/dishes/categories/seafood.svg",
    ingredients: ["西兰花","虾仁"],
    ingredientTypes: {"西兰花":"蔬菜","虾仁":"海鲜"}
  },
  {
    id: "suanrong_xilanhua",
    name: "蒜蓉西兰花",
    category: "素菜",
    tags: ["清淡","素菜","蒜香","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["西兰花","蒜蓉"],
    ingredientTypes: {"西兰花":"蔬菜","蒜蓉":"调料"}
  },
  {
    id: "baicai_dunxia",
    name: "白菜炖虾",
    category: "海鲜类",
    tags: ["海鲜蔬菜","不辣","海鲜","虾","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/seafood.svg",
    ingredients: ["白菜/娃娃菜","带头整虾"],
    ingredientTypes: {"白菜/娃娃菜":"蔬菜","带头整虾":"海鲜"}
  },
  {
    id: "lachang_menfan",
    name: "腊肠焖饭",
    category: "主食类",
    tags: ["腊肠","不辣","主食","猪肉","豆制品","炖煮"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["广式腊肠","青豆/胡萝卜丁","土豆丁/香菇丁"],
    ingredientTypes: {"广式腊肠":"肉类","青豆/胡萝卜丁":"蔬菜","土豆丁/香菇丁":"蔬菜"}
  },
  {
    id: "huamei_xiaopai",
    name: "话梅小排",
    category: "肉类",
    tags: ["排骨","不辣","肉菜","猪肉","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["排骨","话梅"],
    ingredientTypes: {"排骨":"肉类","话梅":"调料"}
  },
  {
    id: "hongshao_paigu",
    name: "红烧排骨",
    category: "肉类",
    tags: ["排骨","可微辣","肉菜","猪肉","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["排骨"],
    ingredientTypes: {"排骨":"肉类"}
  },
  {
    id: "lengmian",
    name: "冷面",
    category: "主食类",
    tags: ["可微辣","主食","辣味","番茄","适合天热"],
    weather: "hot",
    image: "/dishes/categories/staple.svg",
    ingredients: ["半成品冷面","黄瓜","西红柿"],
    ingredientTypes: {"半成品冷面":"面食","黄瓜":"蔬菜","西红柿":"蔬菜"}
  },
  {
    id: "gedatang",
    name: "疙瘩汤",
    category: "汤类",
    tags: ["清淡","适合天冷","汤类","炖煮"],
    weather: "cold",
    image: "/dishes/categories/soup.svg",
    ingredients: ["油菜","香菇","面疙瘩"],
    ingredientTypes: {"油菜":"蔬菜","香菇":"蔬菜","面疙瘩":"面食"}
  },
  {
    id: "aoerliang_kaochi",
    name: "奥尔良烤翅",
    category: "肉类",
    tags: ["鸡肉","微辣","空气炸锅","肉菜","辣味","快手"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["鸡翅","奥尔良烧烤料"],
    ingredientTypes: {"鸡翅":"肉类","奥尔良烧烤料":"调料"}
  },
  {
    id: "shantang_wawacai",
    name: "上汤娃娃菜",
    category: "家常菜",
    tags: ["清淡","下饭菜","鸡蛋","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["娃娃菜","午餐肉","皮蛋","咸鸭蛋"],
    ingredientTypes: {"娃娃菜":"蔬菜","午餐肉":"肉类","皮蛋":"蛋类","咸鸭蛋":"蛋类"}
  },
  {
    id: "xiangjian_sanwenyu",
    name: "香煎三文鱼",
    category: "海鲜类",
    tags: ["鱼类","海鲜","快手","四季"],
    weather: "both",
    image: "/dishes/categories/seafood.svg",
    ingredients: ["三文鱼"],
    ingredientTypes: {"三文鱼":"海鲜"}
  },
  {
    id: "woju_chaorou",
    name: "莴苣炒肉",
    category: "家常菜",
    tags: ["清淡","牛肉","快手","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["莴苣","牛肉"],
    ingredientTypes: {"莴苣":"蔬菜","牛肉":"肉类"}
  },
  {
    id: "qiukui_niurouli",
    name: "秋葵牛肉粒",
    category: "家常菜",
    tags: ["牛肉","清淡","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["秋葵","牛肉块"],
    ingredientTypes: {"秋葵":"蔬菜","牛肉块":"肉类"}
  },
  {
    id: "qiukui_shanbeizhu",
    name: "秋葵扇贝柱",
    category: "海鲜类",
    tags: ["扇贝","清淡","海鲜","四季"],
    weather: "both",
    image: "/dishes/categories/seafood.svg",
    ingredients: ["秋葵","扇贝柱"],
    ingredientTypes: {"秋葵":"蔬菜","扇贝柱":"海鲜"}
  },
  {
    id: "sanzhi_menguo",
    name: "三汁焖锅",
    category: "肉类",
    tags: ["鸡肉","海鲜","炖菜","肉菜","虾","炖煮"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["鸡翅","鸡爪","整虾","焖锅料汁","金针菇/土豆"],
    ingredientTypes: {"鸡翅":"肉类","鸡爪":"肉类","整虾":"海鲜","焖锅料汁":"调料","金针菇/土豆":"蔬菜"}
  },
  {
    id: "donggua_rouwantang",
    name: "冬瓜肉丸汤",
    category: "汤类",
    tags: ["肉丸","清淡","汤类","猪肉","虾","炖煮"],
    weather: "both",
    image: "/dishes/categories/soup.svg",
    ingredients: ["冬瓜","肉末","虾皮"],
    ingredientTypes: {"冬瓜":"蔬菜","肉末":"肉类","虾皮":"海鲜"}
  },
  {
    id: "donggua_gala",
    name: "冬瓜蛤蜊",
    category: "家常菜",
    tags: ["海鲜","清淡","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["冬瓜","冷冻蛤蜊肉"],
    ingredientTypes: {"冬瓜":"蔬菜","冷冻蛤蜊肉":"海鲜"}
  },
  {
    id: "rouwan_yimian",
    name: "肉丸意面",
    category: "主食类",
    tags: ["红酱意面","主食","猪肉","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["肉丸/肉末","红酱","意面"],
    ingredientTypes: {"肉丸/肉末":"肉类","红酱":"调料","意面":"面食"}
  },
  {
    id: "jianmen_doufu",
    name: "煎焖豆腐",
    category: "家常菜",
    tags: ["肉末","下饭菜","猪肉","豆制品","炖煮","快手"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["肉末","豆腐"],
    ingredientTypes: {"肉末":"肉类","豆腐":"豆制品"}
  },
  {
    id: "niunan_gali",
    name: "牛腩咖喱",
    category: "肉类",
    tags: ["牛肉","炖菜","适合天冷","肉菜","咖喱","炖煮"],
    weather: "cold",
    image: "/dishes/categories/meat.svg",
    ingredients: ["牛腩","土豆","胡萝卜","洋葱","咖喱块"],
    ingredientTypes: {"牛腩":"肉类","土豆":"蔬菜","胡萝卜":"蔬菜","洋葱":"蔬菜","咖喱块":"调料"}
  },
  {
    id: "jiurou_gali",
    name: "鸡肉咖喱",
    category: "肉类",
    tags: ["鸡肉","炖菜","适合天冷","肉菜","咖喱","炖煮"],
    weather: "cold",
    image: "/dishes/categories/meat.svg",
    ingredients: ["鸡腿肉/鸡胸肉","土豆","胡萝卜","洋葱","咖喱块"],
    ingredientTypes: {"鸡腿肉/鸡胸肉":"肉类","土豆":"蔬菜","胡萝卜":"蔬菜","洋葱":"蔬菜","咖喱块":"调料"}
  },
  {
    id: "qinghuajiao_niuwa",
    name: "青花椒牛蛙",
    category: "肉类",
    tags: ["牛蛙","微辣","肉菜","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["冷冻牛蛙","青花椒调料"],
    ingredientTypes: {"冷冻牛蛙":"肉类","青花椒调料":"调料"}
  },
  {
    id: "hanshi_banfan",
    name: "韩式拌饭",
    category: "主食类",
    tags: ["清淡","微辣","主食","牛肉","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["豆芽","菌菇","茭瓜","胡萝卜","午餐肉/肥牛卷","韩式辣酱","雪碧"],
    ingredientTypes: {"豆芽":"蔬菜","菌菇":"蔬菜","茭瓜":"蔬菜","胡萝卜":"蔬菜","午餐肉/肥牛卷":"肉类","韩式辣酱":"调料","雪碧":"调料"}
  },
  {
    id: "mapo_doufu",
    name: "麻婆豆腐",
    category: "家常菜",
    tags: ["肉末","下饭菜","猪肉","豆制品","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["肉末","豆腐","郫县豆瓣"],
    ingredientTypes: {"肉末":"肉类","豆腐":"豆制品","郫县豆瓣":"调料"}
  },
  {
    id: "heihujiao_niuliu",
    name: "黑胡椒牛柳",
    category: "肉类",
    tags: ["牛肉","下饭菜","肉菜","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["牛柳/牛肉"],
    ingredientTypes: {"牛柳/牛肉":"肉类"}
  },
  {
    id: "jiaogua_chaorou",
    name: "茭瓜炒肉",
    category: "家常菜",
    tags: ["清淡","牛肉","快手","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["茭瓜","牛肉"],
    ingredientTypes: {"茭瓜":"蔬菜","牛肉":"肉类"}
  },
  {
    id: "lianou_paigutang",
    name: "莲藕排骨汤",
    category: "汤类",
    tags: ["排骨","清淡","汤类","猪肉","炖煮","适合天冷"],
    weather: "cold",
    image: "/dishes/categories/soup.svg",
    ingredients: ["莲藕","排骨","生姜"],
    ingredientTypes: {"莲藕":"蔬菜","排骨":"肉类","生姜":"调料"}
  },
  {
    id: "xihongshi_chaodan",
    name: "西红柿炒蛋",
    category: "家常菜",
    tags: ["清淡","鸡蛋","番茄","快手","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["西红柿","鸡蛋"],
    ingredientTypes: {"西红柿":"蔬菜","鸡蛋":"肉类"}
  },
  {
    id: "niupai_yimian",
    name: "牛排意面",
    category: "主食类",
    tags: ["牛排","中式意面","主食","牛肉","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["牛排","意面","干辣椒"],
    ingredientTypes: {"牛排":"肉类","意面":"面食","干辣椒":"调料"}
  },
  {
    id: "qingzheng_xueyu",
    name: "清蒸鳕鱼",
    category: "海鲜类",
    tags: ["鱼类","清淡","海鲜","快手","四季"],
    weather: "both",
    image: "/dishes/categories/seafood.svg",
    ingredients: ["鳕鱼块","葱丝"],
    ingredientTypes: {"鳕鱼块":"海鲜","葱丝":"调料"}
  },
  {
    id: "gyudon",
    name: "牛丼",
    category: "主食类",
    tags: ["肥牛","清淡","主食","牛肉","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["洋葱","肥牛卷"],
    ingredientTypes: {"洋葱":"蔬菜","肥牛卷":"肉类"}
  },
  {
    id: "suanrong_acai",
    name: "蒜蓉油麦菜",
    category: "素菜",
    tags: ["清淡","素菜","蒜香","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["油麦菜","蒜蓉"],
    ingredientTypes: {"油麦菜":"蔬菜","蒜蓉":"调料"}
  },
  {
    id: "jungu_jitang",
    name: "菌菇鸡汤",
    category: "汤类",
    tags: ["清淡","汤类","鸡肉","炖煮","适合天冷"],
    weather: "cold",
    image: "/dishes/categories/soup.svg",
    ingredients: ["各类菌菇","整鸡","白芷"],
    ingredientTypes: {"各类菌菇":"蔬菜","整鸡":"肉类","白芷":"调料"}
  },
  {
    id: "sanwenyu_yimian",
    name: "三文鱼意面",
    category: "主食类",
    tags: ["白酱意面","主食","鱼类","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["三文鱼","意面","白酱","淡奶油/黄油","白葡萄酒"],
    ingredientTypes: {"三文鱼":"海鲜","意面":"面食","白酱":"调料","淡奶油/黄油":"调料","白葡萄酒":"调料"}
  },
  {
    id: "baicai_duntofu",
    name: "白菜炖豆腐",
    category: "家常菜",
    tags: ["粉条","猪肉","豆制品","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["粉条","白菜/娃娃菜","豆腐"],
    ingredientTypes: {"粉条":"面食","白菜/娃娃菜":"蔬菜","豆腐":"豆制品"}
  },
  {
    id: "roumo_doujiao",
    name: "肉末豆角",
    category: "家常菜",
    tags: ["肉末","下饭菜","猪肉","豆制品","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["肉末","豆角"],
    ingredientTypes: {"肉末":"豆类","豆角":"蔬菜"}
  },
  {
    id: "kao_caihua",
    name: "烤菜花",
    category: "素菜",
    tags: ["微辣","空气炸锅","素菜","辣味","快手","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["菜花"],
    ingredientTypes: {"菜花":"蔬菜"}
  },
  {
    id: "hongshao_niunan",
    name: "红烧牛腩",
    category: "肉类",
    tags: ["牛肉","微辣","肉菜","辣味","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["牛腩","八角","香叶","草果"],
    ingredientTypes: {"牛腩":"肉类","八角":"调料","香叶":"调料","草果":"调料"}
  },
  {
    id: "xingbaogu_niurou",
    name: "杏鲍菇牛肉",
    category: "家常菜",
    tags: ["牛肉","下饭菜","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["杏鲍菇","牛肉"],
    ingredientTypes: {"杏鲍菇":"蔬菜","牛肉":"肉类"}
  },
  {
    id: "loco_moco",
    name: "loco moco",
    category: "肉类",
    tags: ["牛肉饼","下饭菜","肉菜","牛肉","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["牛肉馅/汉堡饼","牛肉broth","洋葱","白口蘑","黄油"],
    ingredientTypes: {"牛肉馅/汉堡饼":"肉类","牛肉broth":"调料","洋葱":"蔬菜","白口蘑":"蔬菜","黄油":"调料"}
  },
  {
    id: "luobo_dunxia",
    name: "萝卜炖虾",
    category: "汤类",
    tags: ["清淡","汤类","虾","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/soup.svg",
    ingredients: ["萝卜","整虾"],
    ingredientTypes: {"萝卜":"蔬菜","整虾":"海鲜"}
  },
  {
    id: "lusun_xiaren",
    name: "芦笋虾仁",
    category: "素菜",
    tags: ["虾仁","清淡","素菜","虾","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["芦笋","冷冻虾仁"],
    ingredientTypes: {"芦笋":"蔬菜","冷冻虾仁":"海鲜"}
  },
  {
    id: "huangmen_ji",
    name: "黄焖鸡",
    category: "肉类",
    tags: ["鸡肉","炖菜","肉菜","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["鸡腿肉","青椒","土豆","干香菇"],
    ingredientTypes: {"鸡腿肉":"肉类","青椒":"蔬菜","土豆":"蔬菜","干香菇":"蔬菜"}
  },
  {
    id: "kele_jichi",
    name: "可乐鸡翅",
    category: "肉类",
    tags: ["鸡翅","下饭菜","肉菜","鸡肉","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["鸡翅"],
    ingredientTypes: {"鸡翅":"肉类"}
  },
  {
    id: "hanshi_paigutang",
    name: "韩式排骨汤",
    category: "肉类",
    tags: ["牛排骨","微辣","下饭菜","肉菜","牛肉","猪肉"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["大酱","泡菜","整只干虾","牛排骨","虾皮"],
    ingredientTypes: {"大酱":"调料","泡菜":"调料","整只干虾":"海鲜","牛排骨":"肉类","虾皮":"调料"}
  },
  {
    id: "shanyao_dunniunan",
    name: "山药炖牛腩",
    category: "汤类",
    tags: ["牛腩","清淡","汤类","牛肉","炖煮","适合天冷"],
    weather: "cold",
    image: "/dishes/categories/soup.svg",
    ingredients: ["山药","牛腩","白芷","生姜","草果"],
    ingredientTypes: {"山药":"蔬菜","牛腩":"肉类","白芷":"调料","生姜":"调料","草果":"调料"}
  },
  {
    id: "qincai_niurou",
    name: "芹菜牛肉",
    category: "家常菜",
    tags: ["牛肉","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["芹菜","牛肉"],
    ingredientTypes: {"芹菜":"蔬菜","牛肉":"肉类"}
  },
  {
    id: "gali_zhupaifan",
    name: "咖喱猪排饭",
    category: "肉类",
    tags: ["猪排","下饭菜","空气炸锅","肉菜","猪肉","咖喱"],
    weather: "cold",
    image: "/dishes/categories/meat.svg",
    ingredients: ["咖喱块","土豆","洋葱","胡萝卜","猪排","炸粉"],
    ingredientTypes: {"咖喱块":"调料","土豆":"蔬菜","洋葱":"蔬菜","胡萝卜":"蔬菜","猪排":"肉类","炸粉":"调料"}
  },
  {
    id: "qingdun_yangtang",
    name: "清炖羊汤",
    category: "汤类",
    tags: ["羊腿肉","清淡","汤类","羊肉","炖煮","适合天冷"],
    weather: "cold",
    image: "/dishes/categories/soup.svg",
    ingredients: ["羊腿肉/羊排","白萝卜","香菜","葱花"],
    ingredientTypes: {"羊腿肉/羊排":"肉类","白萝卜":"蔬菜","香菜":"调料","葱花":"调料"}
  },
  {
    id: "suancaiyu",
    name: "酸菜鱼",
    category: "家常菜",
    tags: ["半成品","下饭菜","大乱炖","鱼类","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["半成品酸菜鱼","宽粉","速冻黑鱼片","丸子","扇贝/鲍鱼","豆芽/莴苣"],
    ingredientTypes: {"半成品酸菜鱼":"调料","宽粉":"面食","速冻黑鱼片":"海鲜","丸子":"肉类","扇贝/鲍鱼":"海鲜","豆芽/莴苣":"蔬菜"}
  },
  {
    id: "sanxian_tang",
    name: "三鲜汤",
    category: "汤类",
    tags: ["清淡","豆腐","菌菇","汤类","虾","豆制品"],
    weather: "both",
    image: "/dishes/categories/soup.svg",
    ingredients: ["口蘑","海鲜菇","带头整虾","咸鸭蛋","豆腐"],
    ingredientTypes: {"口蘑":"蔬菜","海鲜菇":"蔬菜","带头整虾":"海鲜","咸鸭蛋":"蛋类","豆腐":"豆制品"}
  },
  {
    id: "koumo_jituirou",
    name: "口蘑鸡腿肉",
    category: "肉类",
    tags: ["鸡肉","下饭菜","肉菜","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["白口蘑","鸡腿肉"],
    ingredientTypes: {"白口蘑":"蔬菜","鸡腿肉":"肉类"}
  },
  {
    id: "shanyao_yumi_paigu",
    name: "山药玉米排骨汤",
    category: "汤类",
    tags: ["排骨","清淡","汤类","猪肉","炖煮","适合天冷"],
    weather: "cold",
    image: "/dishes/categories/soup.svg",
    ingredients: ["山药","玉米","排骨","生姜","白芷"],
    ingredientTypes: {"山药":"蔬菜","玉米":"蔬菜","排骨":"肉类","生姜":"调料","白芷":"调料"}
  },
  {
    id: "sanwenyu_menfan",
    name: "三文鱼焖饭",
    category: "主食类",
    tags: ["鱼类","清淡","主食","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["三文鱼","胡萝卜","海鲜菇","黄油"],
    ingredientTypes: {"三文鱼":"海鲜","胡萝卜":"蔬菜","海鲜菇":"蔬菜","黄油":"调料"}
  },
  {
    id: "qingjiao_niurou",
    name: "青椒牛肉",
    category: "家常菜",
    tags: ["牛肉","下饭菜","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["青椒","牛肉"],
    ingredientTypes: {"青椒":"蔬菜","牛肉":"肉类"}
  },
  {
    id: "qingchao_tonghao",
    name: "清炒茼蒿",
    category: "素菜",
    tags: ["清淡","素菜","蒜香","快手","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["茼蒿","蒜蓉"],
    ingredientTypes: {"茼蒿":"蔬菜","蒜蓉":"调料"}
  },
  {
    id: "mala_ganguo",
    name: "麻辣干锅",
    category: "家常菜",
    tags: ["半成品","下饭菜","大乱炖","牛肉","鸡肉","辣味"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["干锅酱","肥牛卷","宽粉","鸡翅","金针菇/莴苣","莲藕片","丸子"],
    ingredientTypes: {"干锅酱":"调料","肥牛卷":"肉类","宽粉":"面食","鸡翅":"肉类","金针菇/莴苣":"蔬菜","莲藕片":"蔬菜","丸子":"肉类"}
  },
  {
    id: "paigu_mifan",
    name: "排骨米饭",
    category: "肉类",
    tags: ["猪脊骨","下饭菜","肉菜","猪肉","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["猪脊骨","陈皮","草果"],
    ingredientTypes: {"猪脊骨":"肉类","陈皮":"调料","草果":"调料"}
  },
  {
    id: "zhuzhou_fan",
    name: "猪肘饭",
    category: "肉类",
    tags: ["猪肘子","下饭菜","肉菜","猪肉","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["猪肘子"],
    ingredientTypes: {"猪肘子":"肉类"}
  },
  {
    id: "youcai_xianggu",
    name: "油菜香菇",
    category: "素菜",
    tags: ["清淡","素菜","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["油菜","干香菇"],
    ingredientTypes: {"油菜":"蔬菜","干香菇":"蔬菜"}
  },
  {
    id: "yundousi_roumo",
    name: "芸豆丝肉末",
    category: "家常菜",
    tags: ["肉末","下饭菜","猪肉","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["芸豆","肉末"],
    ingredientTypes: {"芸豆":"蔬菜","肉末":"肉类"}
  },
  {
    id: "suantai_chaorou",
    name: "蒜苔炒肉",
    category: "家常菜",
    tags: ["猪肉","下饭菜","牛肉","蒜香","快手","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["蒜苔","牛肉/猪肉"],
    ingredientTypes: {"蒜苔":"蔬菜","牛肉/猪肉":"肉类"}
  },
  {
    id: "shanbei_jungu_menfan",
    name: "扇贝菌菇焖饭",
    category: "主食类",
    tags: ["扇贝柱","菌菇","清淡","主食","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["冷冻大扇贝","海鲜菇","胡萝卜"],
    ingredientTypes: {"冷冻大扇贝":"海鲜","海鲜菇":"蔬菜","胡萝卜":"蔬菜"}
  },
  {
    id: "shouzhuafan",
    name: "手抓饭",
    category: "主食类",
    tags: ["羊腿肉","清淡","主食","羊肉","四季"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["羊腿肉/羊排","胡萝卜","洋葱"],
    ingredientTypes: {"羊腿肉/羊排":"肉类","胡萝卜":"蔬菜","洋葱":"蔬菜"}
  },
  {
    id: "qingchao_caixin",
    name: "清炒菜心",
    category: "素菜",
    tags: ["清淡","素菜","蒜香","快手","四季"],
    weather: "both",
    image: "/dishes/categories/vegetable.svg",
    ingredients: ["菜心","蒜蓉"],
    ingredientTypes: {"菜心":"蔬菜","蒜蓉":"调料"}
  },
  {
    id: "ziran_yangcong_niurou",
    name: "孜然洋葱牛肉",
    category: "肉类",
    tags: ["肥牛卷","下饭菜","肉菜","牛肉","快手","四季"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["烧烤料","孜然粒","洋葱","牛肉/肥牛卷"],
    ingredientTypes: {"烧烤料":"调料","孜然粒":"调料","洋葱":"蔬菜","牛肉/肥牛卷":"肉类"}
  },
  {
    id: "yutou_niuleitiao",
    name: "芋头牛肋条",
    category: "肉类",
    tags: ["牛肋条","微辣","下饭菜","肉菜","牛肉","辣味"],
    weather: "both",
    image: "/dishes/categories/meat.svg",
    ingredients: ["青辣椒","小米辣","牛肋条","荔浦芋头","蒜蓉"],
    ingredientTypes: {"青辣椒":"调料","小米辣":"调料","牛肋条":"牛肉","荔浦芋头":"蔬菜","蒜蓉":"调料"}
  },
  {
    id: "jiaogua_jidan_xiaren",
    name: "茭瓜鸡蛋虾仁蒸饺",
    category: "主食类",
    tags: ["饺子","素馅","主食","虾","鸡蛋","快手"],
    weather: "both",
    image: "/dishes/categories/staple.svg",
    ingredients: ["茭瓜","冷冻虾仁","花椒油"],
    ingredientTypes: {"茭瓜":"蔬菜","冷冻虾仁":"海鲜","花椒油":"调料"}
  },
  {
    id: "xiaolongxia",
    name: "小龙虾",
    category: "家常菜",
    tags: ["半成品","下饭菜","大乱炖","虾","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/home-style.svg",
    ingredients: ["半成品小龙虾","冷冻小龙虾尾","扇贝/鲍鱼","宽粉"],
    ingredientTypes: {"半成品小龙虾":"调料","冷冻小龙虾尾":"肉类","扇贝/鲍鱼":"海鲜","宽粉":"面食"}
  },
  {
    id: "yishi_sanmingzhi",
    name: "意式三明治",
    category: "早餐",
    tags: ["空气炸锅","早餐","番茄","四季"],
    weather: "both",
    image: "/dishes/categories/breakfast.svg",
    ingredients: ["小西红柿","意式火腿","酸面包","奶酪"],
    ingredientTypes: {"小西红柿":"蔬菜","意式火腿":"肉类","酸面包":"面食","奶酪":"奶制品"}
  },
  {
    id: "jiangxiangbing",
    name: "酱香饼",
    category: "早餐",
    tags: ["可配烤肠","早餐","快手","四季"],
    weather: "both",
    image: "/dishes/categories/breakfast.svg",
    ingredients: ["半成品酱香饼","台式小烤肠"],
    ingredientTypes: {"半成品酱香饼":"面食","台式小烤肠":"肉类"}
  },
  {
    id: "meiguo_basike",
    name: "莓果巴斯克",
    category: "甜品",
    tags: ["烤箱","甜食","甜品","鸡蛋","快手","四季"],
    weather: "both",
    image: "/dishes/categories/dessert.svg",
    ingredients: ["蓝莓/树莓","whipping cream","cream cheese","鸡蛋","吉利丁片"],
    ingredientTypes: {"蓝莓/树莓":"水果","whipping cream":"奶制品","cream cheese":"奶制品","鸡蛋":"蛋类","吉利丁片":"调料"}
  },
  {
    id: "danta",
    name: "蛋挞",
    category: "甜品",
    tags: ["烤箱","甜食","半成品","甜品","鸡蛋","快手"],
    weather: "both",
    image: "/dishes/categories/dessert.svg",
    ingredients: ["蛋挞壳","whipping cream","鸡蛋"],
    ingredientTypes: {"蛋挞壳":"奶制品","whipping cream":"奶制品","鸡蛋":"蛋类"}
  },
  {
    id: "yanduxian",
    name: "腌笃鲜",
    category: "汤类",
    tags: ["清淡","汤类","猪肉","炖煮","四季"],
    weather: "both",
    image: "/dishes/categories/soup.svg",
    ingredients: ["豆结","咸肉","排骨","春笋"],
    ingredientTypes: {"豆结":"豆制品","咸肉":"肉类","排骨":"肉类","春笋":"蔬菜"}
  }
];

export const recipes: Recipe[] = recipeLibrary.map((recipe) => ({
  ...recipe,
  image: dishPhotos[recipe.id] ?? recipe.image
}));
