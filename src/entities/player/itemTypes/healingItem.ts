import { Scene } from "@babylonjs/core";
import { Item } from "../items";
import { Player } from "../player";

export class HealingItem extends Item {
    constructor(scene: Scene) {
        super("Healing Potion", scene);
    }

    public use(player: Player): boolean {
        if (player.health >= 100) return false;
        player.health = Math.min(player.health + 10, 100);
        // play sound or show effect
        return true;
    }
}