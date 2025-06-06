import { Scene } from "@babylonjs/core";
import { Item } from "../items";
import { Player } from "../player";

export class HealingItem extends Item {
    public readonly iconName: string = "health-potion.png";
    constructor(scene: Scene) {
        super("Healing Potion", scene);
    }

    public use(player: Player): boolean {
        if (player.health >= 100) return false;
        player.health = Math.min(player.health + 10, 100);
        player.view.showNotification(
            "Healed!",
            "#4caf50",
            8000 // Show for 8 seconds
        );
        return true;
    }
}