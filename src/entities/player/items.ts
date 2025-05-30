import { Entity } from "../entity";
import { Player } from "./player";

export class Item extends Entity {
    // Add use
    public use(_player: Player): boolean {
        console.warn("Use method not implemented for item:", this.name);
        return false; // Default behavior, can be overridden
    }

}