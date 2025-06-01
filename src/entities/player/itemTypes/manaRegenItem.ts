import { Scene } from "@babylonjs/core";
import { Item } from "../items";
import { Player } from "../player";

export class ManaRegenItem extends Item {
    public readonly iconName: string = "mana-regen.png";
    constructor(scene: Scene) {
        super("Mana Regen Upgrade", scene);
    }

    public use(player: Player): boolean {
        if (!player["manaRegenBonus"]) player["manaRegenBonus"] = 0;
        player["manaRegenBonus"] += 2;
        // use the playerview to notify that the mana regen bonus has changed
        player.view.showNotification(
            "Mana regen increased!",
            "#4caf50",
            8000 // Show for 8 seconds
        );
        return true;
    }
}