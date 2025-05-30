
export class Utils {
    // On renvoie un nombre aléatoire entre une valeur min (incluse)
    // et une valeur max (exclue)
    public static getRandomArbitrary(min: number, max: number) {
        return Math.floor(Math.random() * (max - min) + min);
    }

}
