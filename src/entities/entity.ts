import {
    TransformNode,
    Scene,
    Mesh,
    Vector3,
    PhysicsBody,
    PhysicsMotionType,
    PhysicsShapeMesh,
    PhysicsShapeType,
    PhysicsAggregate,
} from "@babylonjs/core";

export abstract class Entity extends TransformNode {
    public _mesh: Mesh;
    public _body: PhysicsBody;
    public _isLethal: boolean;
    public _isLethalPlayer: boolean;
    public _isLethalEnemy: boolean;

    constructor(name: string, scene: Scene) {
        super(name, scene);
        this._isLethal = false;
        this._isLethalPlayer = false;
        this._isLethalEnemy = false;
    }

    public _initPhysicsMesh(
        mesh: Mesh,
        motionType: PhysicsMotionType,
        mass: number,
        angularDamping: number = 1
    ): void {
        const shape = new PhysicsShapeMesh(mesh, this._scene);
        const body = new PhysicsBody(mesh.parent as TransformNode, motionType, false, this._scene);
        body.shape = shape;
        body.setMassProperties({ mass });
        body.setAngularDamping(angularDamping);
        body.setCollisionCallbackEnabled(true);
        this._body = body;
    }

    protected _initPhysicsAggregate(mesh: Mesh, mass: number): void {
        const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, {
            mass,
            restitution: 0.3,
            friction: 0.5
        }, this._scene);
        this._body = aggregate.body;
    }

    protected _clampVelocity(maxSpeed: number): void {
        const velocity = this._body.getLinearVelocity();
        if (velocity.length() > maxSpeed) {
            this._body.setLinearVelocity(velocity.normalize().scale(maxSpeed));
        }
    }

    protected _dampenVelocity(dampingFactor: number): void {
        const velocity = this._body.getLinearVelocity();
        this._body.setLinearVelocity(new Vector3(
            velocity.x * dampingFactor,
            velocity.y,
            velocity.z * dampingFactor
        ));
    }

    public get position(): Vector3 {
        return this._body?.transformNode?.position.clone() ?? Vector3.Zero();
    }
}
