/** 全站动效曲线：JS 侧统一用这两条，CSS 侧对应 --spring */

export const SPRING = [0.22, 1, 0.36, 1] as const;
export const SPRING_ENTER = [0.16, 1, 0.3, 1] as const;

/** motion 的 Easing 类型不收普通 number[]，统一在这一处做类型收窄 */
export const springEase = SPRING as unknown as never;
export const springEnterEase = SPRING_ENTER as unknown as never;
