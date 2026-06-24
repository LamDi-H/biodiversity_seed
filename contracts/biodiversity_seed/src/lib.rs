#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address,
    Env, String,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedLot {
    pub lot_id: u32,
    pub species: String,
    pub origin: String,
    pub total: u32,
    pub available: u32,
    pub custodian: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Movement {
    pub movement_id: u32,
    pub lot_id: u32,
    pub action: String,
    pub actor: Address,
    pub amount: u32,
    pub note: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    LotCounter,
    MovementCounter,
    Lot(u32),
    Movement(u32),
}

#[contractevent(topics = ["seed", "register"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedRegisteredEvent {
    #[topic]
    pub lot_id: u32,
    pub movement_id: u32,
    pub amount: u32,
}

#[contractevent(topics = ["seed", "checkout"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedCheckoutEvent {
    #[topic]
    pub lot_id: u32,
    pub movement_id: u32,
    pub amount: u32,
}

#[contractevent(topics = ["seed", "return"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedReturnEvent {
    #[topic]
    pub lot_id: u32,
    pub movement_id: u32,
    pub amount: u32,
}

#[contractevent(topics = ["seed", "deplete"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedDepleteEvent {
    #[topic]
    pub lot_id: u32,
    pub movement_id: u32,
    pub amount: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SeedError {
    LotNotFound = 1,
    InvalidAmount = 2,
    InsufficientSeeds = 3,
    NotCustodian = 4,
    Overflow = 5,
}

#[contract]
pub struct BiodiversitySeed;

#[contractimpl]
impl BiodiversitySeed {
    pub fn register_lot(
        env: Env,
        custodian: Address,
        species: String,
        origin: String,
        count: u32,
    ) -> u32 {
        custodian.require_auth();
        assert_positive(&env, count);

        let lot_id = checked_add(&env, read_lot_counter(&env), 1);

        let lot = SeedLot {
            lot_id,
            species,
            origin,
            total: count,
            available: count,
            custodian: custodian.clone(),
        };

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);
        env.storage()
            .persistent()
            .set(&DataKey::LotCounter, &lot_id);

        let movement_id = append_movement(
            &env,
            lot_id,
            String::from_str(&env, "register"),
            custodian,
            count,
            String::from_str(&env, "new seed lot"),
        );

        SeedRegisteredEvent {
            lot_id,
            movement_id,
            amount: count,
        }
        .publish(&env);

        lot_id
    }

    pub fn checkout(
        env: Env,
        researcher: Address,
        lot_id: u32,
        amount: u32,
        study: String,
    ) -> SeedLot {
        researcher.require_auth();
        assert_positive(&env, amount);

        let mut lot = read_lot_or_panic(&env, lot_id);

        if lot.available < amount {
            panic_with_error!(&env, SeedError::InsufficientSeeds);
        }

        lot.available = checked_sub(&env, lot.available, amount);

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let movement_id = append_movement(
            &env,
            lot_id,
            String::from_str(&env, "checkout"),
            researcher,
            amount,
            study,
        );

        SeedCheckoutEvent {
            lot_id,
            movement_id,
            amount,
        }
        .publish(&env);

        lot
    }

    pub fn return_seeds(
        env: Env,
        researcher: Address,
        lot_id: u32,
        amount: u32,
        note: String,
    ) -> SeedLot {
        researcher.require_auth();
        assert_positive(&env, amount);

        let mut lot = read_lot_or_panic(&env, lot_id);
        let new_available = checked_add(&env, lot.available, amount);

        if new_available > lot.total {
            panic_with_error!(&env, SeedError::Overflow);
        }

        lot.available = new_available;

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let movement_id = append_movement(
            &env,
            lot_id,
            String::from_str(&env, "return"),
            researcher,
            amount,
            note,
        );

        SeedReturnEvent {
            lot_id,
            movement_id,
            amount,
        }
        .publish(&env);

        lot
    }

    pub fn deplete(
        env: Env,
        custodian: Address,
        lot_id: u32,
        amount: u32,
        reason: String,
    ) -> SeedLot {
        custodian.require_auth();
        assert_positive(&env, amount);

        let mut lot = read_lot_or_panic(&env, lot_id);

        if custodian != lot.custodian {
            panic_with_error!(&env, SeedError::NotCustodian);
        }

        if lot.available < amount {
            panic_with_error!(&env, SeedError::InsufficientSeeds);
        }

        lot.available = checked_sub(&env, lot.available, amount);
        lot.total = checked_sub(&env, lot.total, amount);

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let movement_id = append_movement(
            &env,
            lot_id,
            String::from_str(&env, "deplete"),
            custodian,
            amount,
            reason,
        );

        SeedDepleteEvent {
            lot_id,
            movement_id,
            amount,
        }
        .publish(&env);

        lot
    }

    pub fn get_lot(env: Env, lot_id: u32) -> SeedLot {
        read_lot_or_panic(&env, lot_id)
    }

    pub fn get_movement(env: Env, movement_id: u32) -> Movement {
        match env
            .storage()
            .persistent()
            .get::<DataKey, Movement>(&DataKey::Movement(movement_id))
        {
            Some(movement) => movement,
            None => panic_with_error!(&env, SeedError::LotNotFound),
        }
    }

    pub fn get_counts(env: Env) -> (u32, u32) {
        (read_lot_counter(&env), read_movement_counter(&env))
    }
}

fn read_lot_counter(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get::<DataKey, u32>(&DataKey::LotCounter)
        .unwrap_or(0)
}

fn read_movement_counter(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get::<DataKey, u32>(&DataKey::MovementCounter)
        .unwrap_or(0)
}

fn read_lot_or_panic(env: &Env, lot_id: u32) -> SeedLot {
    match env
        .storage()
        .persistent()
        .get::<DataKey, SeedLot>(&DataKey::Lot(lot_id))
    {
        Some(lot) => lot,
        None => panic_with_error!(env, SeedError::LotNotFound),
    }
}

fn append_movement(
    env: &Env,
    lot_id: u32,
    action: String,
    actor: Address,
    amount: u32,
    note: String,
) -> u32 {
    let movement_id = checked_add(env, read_movement_counter(env), 1);

    let movement = Movement {
        movement_id,
        lot_id,
        action,
        actor,
        amount,
        note,
    };

    env.storage()
        .persistent()
        .set(&DataKey::Movement(movement_id), &movement);

    env.storage()
        .persistent()
        .set(&DataKey::MovementCounter, &movement_id);

    movement_id
}

fn assert_positive(env: &Env, amount: u32) {
    if amount == 0 {
        panic_with_error!(env, SeedError::InvalidAmount);
    }
}

fn checked_add(env: &Env, left: u32, right: u32) -> u32 {
    match left.checked_add(right) {
        Some(value) => value,
        None => panic_with_error!(env, SeedError::Overflow),
    }
}

fn checked_sub(env: &Env, left: u32, right: u32) -> u32 {
    match left.checked_sub(right) {
        Some(value) => value,
        None => panic_with_error!(env, SeedError::InsufficientSeeds),
    }
}

mod test;