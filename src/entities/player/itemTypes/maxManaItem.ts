import { Scene } from "@babylonjs/core";
import { Item } from "../items";
import { Player } from "../player";

export class MaxManaItem extends Item {
    public readonly iconName: string = "max-mana.png";
    constructor(scene: Scene) {
        super("Max Mana Upgrade", scene);
    }

    public use(player: Player): boolean {
        player["maxMana"] = (player["maxMana"] || 100) + 10;
        player["mana"] = Math.min(player["mana"] + 10, player["maxMana"]);
        player.view.showNotification(
            "Max mana increased!",
            "#4caf50",
            8000 // Show for 8 seconds
        );
        return true;
    }
}