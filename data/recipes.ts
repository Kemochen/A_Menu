export type WeatherSuitability = "cold" | "hot" | "both";

export type Recipe = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  weather: WeatherSuitability;
  image: string;
  ingredients: string[];
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

export const recipes: Recipe[] = [
  {
    id: "tomato-basil-pasta",
    name: "番茄罗勒意面",
    category: "面食",
    tags: ["素食", "快手", "暖心"],
    weather: "both",
    image: "/dishes/tomato-basil-pasta.svg",
    ingredients: ["番茄", "罗勒", "大蒜", "意面", "橄榄油", "帕玛森芝士"],
    initialLastEatenDaysAgo: 14
  },
  {
    id: "ginger-chicken-soup",
    name: "姜香鸡汤",
    category: "汤品",
    tags: ["暖胃", "高蛋白", "清淡"],
    weather: "cold",
    image: "/dishes/ginger-chicken-soup.svg",
    ingredients: ["鸡肉", "姜", "大蒜", "胡萝卜", "葱", "鸡汤底"],
    initialLastEatenDaysAgo: 8
  },
  {
    id: "cucumber-cold-noodles",
    name: "黄瓜凉面",
    category: "面食",
    tags: ["冰爽", "芝麻", "开胃"],
    weather: "hot",
    image: "/dishes/cucumber-cold-noodles.svg",
    ingredients: ["黄瓜", "面条", "芝麻酱", "酱油", "大蒜", "辣椒油"],
    initialLastEatenDaysAgo: 21
  },
  {
    id: "lemon-herb-fish",
    name: "柠檬香草鱼",
    category: "海鲜",
    tags: ["清爽", "柠檬", "高蛋白"],
    weather: "both",
    image: "/dishes/lemon-herb-fish.svg",
    ingredients: ["白身鱼", "柠檬", "欧芹", "大蒜", "橄榄油", "黑胡椒"],
    initialLastEatenDaysAgo: 12
  },
  {
    id: "spicy-tofu-rice",
    name: "香辣豆腐饭",
    category: "米饭",
    tags: ["素食", "微辣", "饱腹"],
    weather: "cold",
    image: "/dishes/spicy-tofu-rice.svg",
    ingredients: ["豆腐", "米饭", "大蒜", "姜", "豆瓣酱", "葱"],
    initialLastEatenDaysAgo: 5
  },
  {
    id: "watermelon-feta-salad",
    name: "西瓜菲达沙拉",
    category: "沙拉",
    tags: ["清新", "免开火", "咸甜"],
    weather: "hot",
    image: "/dishes/watermelon-feta-salad.svg",
    ingredients: ["西瓜", "菲达芝士", "薄荷", "黄瓜", "青柠", "橄榄油"],
    initialLastEatenDaysAgo: 18
  }
];
