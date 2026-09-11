declare module "lunar-javascript" {
  export class Lunar {
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getJieQi(): string;
  }
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getFestivals(): string[];
  }
}
