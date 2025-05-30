import { Scene } from "@babylonjs/core";
import { RoomModel } from "./model/roomModel";
import { RoomView } from "./view/roomView";
import { RoofModel } from "./model/roofModel";
import { WallModel } from "./model/wallModel";

export class Environment {
    private readonly _scene: Scene;
    private _currentRoomView: RoomView | null = null;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public generateRoom(room: RoomModel): void {
        console.log(`Generating room: ${room.name}`);

        // Dispose of the current room view if it exists
        if (this._currentRoomView) {
            this._currentRoomView.dispose();
        }

        // Create a new RoomView for the room
        this._currentRoomView = new RoomView(this._scene, room);

        // Set transparency for the roof and walls
        this._currentRoomView._setRoofTransparency(RoofModel.ROOF_TRANSPARENCY);
        this._currentRoomView._setWallsTransparency(WallModel.WALL_TRANSPARENCY);

        // Update the room view
        this._currentRoomView.update();
    }
}