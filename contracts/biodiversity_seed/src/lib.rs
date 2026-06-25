#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address,
    Env, String,
};

pub const STATUS_ACTIVE: u32 = 1;
pub const STATUS_UNDER_REVIEW: u32 = 2;
pub const STATUS_RISK_FLAGGED: u32 = 3;
pub const STATUS_DISTRIBUTED: u32 = 4;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlatformConfig {
    pub admin: Address,
    pub institution: String,
    pub initialized_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedLot {
    pub lot_id: u32,
    pub accession_code: String,
    pub species: String,
    pub origin: String,
    pub total_samples: u32,
    pub available_samples: u32,
    pub custodian: Address,
    pub status: u32,
    pub viability_score: u32,
    pub risk_score: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CustodyRecord {
    pub record_id: u32,
    pub lot_id: u32,
    pub action: String,
    pub actor: Address,
    pub amount: u32,
    pub note: String,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistryStats {
    pub total_lots: u32,
    pub active_lots: u32,
    pub distributed_lots: u32,
    pub risk_lots: u32,
    pub total_samples: u32,
    pub available_samples: u32,
    pub custody_records: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    Stats,
    LotCounter,
    RecordCounter,
    Lot(u32),
    Record(u32),
}

#[contractevent(topics = ["platform", "initialized"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlatformInitializedEvent {
    #[topic]
    pub admin: Address,
    pub institution: String,
    pub initialized_at: u64,
}

#[contractevent(topics = ["seed", "created"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SeedLotCreatedEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub total_samples: u32,
}

#[contractevent(topics = ["seed", "custody_transferred"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CustodyTransferredEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub amount: u32,
}

#[contractevent(topics = ["seed", "viability_recorded"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ViabilityRecordedEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub viability_score: u32,
}

#[contractevent(topics = ["seed", "samples_reserved"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SamplesReservedEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub amount: u32,
}

#[contractevent(topics = ["seed", "samples_released"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SamplesReleasedEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub amount: u32,
}

#[contractevent(topics = ["seed", "risk_flagged"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskFlaggedEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub risk_score: u32,
}

#[contractevent(topics = ["seed", "distributed"], data_format = "map")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DistributedEvent {
    #[topic]
    pub lot_id: u32,
    pub record_id: u32,
    pub amount: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SeedError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    SeedLotNotFound = 3,
    InvalidAmount = 4,
    InsufficientSamples = 5,
    NotCustodian = 6,
    Overflow = 7,
    InvalidScore = 8,
    AlreadyDistributed = 9,
    InvalidStatus = 10,
}

#[contract]
pub struct BiodiversitySeed;

#[contractimpl]
impl BiodiversitySeed {
    pub fn initialize(env: Env, admin: Address, institution: String) -> PlatformConfig {
        admin.require_auth();

        if env
            .storage()
            .persistent()
            .get::<DataKey, PlatformConfig>(&DataKey::Config)
            .is_some()
        {
            panic_with_error!(&env, SeedError::AlreadyInitialized);
        }

        let config = PlatformConfig {
            admin: admin.clone(),
            institution: institution.clone(),
            initialized_at: env.ledger().timestamp(),
        };

        let stats = RegistryStats {
            total_lots: 0,
            active_lots: 0,
            distributed_lots: 0,
            risk_lots: 0,
            total_samples: 0,
            available_samples: 0,
            custody_records: 0,
        };

        env.storage().persistent().set(&DataKey::Config, &config);
        env.storage().persistent().set(&DataKey::Stats, &stats);

        PlatformInitializedEvent {
            admin,
            institution,
            initialized_at: config.initialized_at,
        }
        .publish(&env);

        config
    }

    pub fn create_seed_lot(
        env: Env,
        custodian: Address,
        accession_code: String,
        species: String,
        origin: String,
        total_samples: u32,
        viability_score: u32,
    ) -> SeedLot {
        require_initialized(&env);
        custodian.require_auth();
        assert_positive(&env, total_samples);
        assert_valid_score(&env, viability_score);

        let lot_id = checked_add(&env, read_lot_counter(&env), 1);
        let now = env.ledger().timestamp();

        let status = if viability_score < 50 {
            STATUS_UNDER_REVIEW
        } else {
            STATUS_ACTIVE
        };

        let lot = SeedLot {
            lot_id,
            accession_code,
            species,
            origin,
            total_samples,
            available_samples: total_samples,
            custodian: custodian.clone(),
            status,
            viability_score,
            risk_score: 0,
            created_at: now,
            updated_at: now,
        };

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);
        env.storage()
            .persistent()
            .set(&DataKey::LotCounter, &lot_id);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "create_seed_lot"),
            custodian,
            total_samples,
            String::from_str(&env, "registered seed lot"),
        );

        let mut stats = read_stats(&env);
        stats.total_lots = checked_add(&env, stats.total_lots, 1);
        stats.active_lots = checked_add(&env, stats.active_lots, 1);
        stats.total_samples = checked_add(&env, stats.total_samples, total_samples);
        stats.available_samples = checked_add(&env, stats.available_samples, total_samples);
        stats.custody_records = checked_add(&env, stats.custody_records, 1);
        write_stats(&env, &stats);

        SeedLotCreatedEvent {
            lot_id,
            record_id,
            total_samples,
        }
        .publish(&env);

        lot
    }

    pub fn transfer_custody(
        env: Env,
        current_custodian: Address,
        new_custodian: Address,
        lot_id: u32,
        note: String,
    ) -> SeedLot {
        require_initialized(&env);
        current_custodian.require_auth();

        let mut lot = read_lot_or_panic(&env, lot_id);
        assert_not_distributed(&env, &lot);

        if current_custodian != lot.custodian {
            panic_with_error!(&env, SeedError::NotCustodian);
        }

        lot.custodian = new_custodian;
        lot.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "transfer_custody"),
            current_custodian,
            0,
            note,
        );

        let mut stats = read_stats(&env);
        stats.custody_records = checked_add(&env, stats.custody_records, 1);
        write_stats(&env, &stats);

        CustodyTransferredEvent {
            lot_id,
            record_id,
            amount: 0,
        }
        .publish(&env);

        lot
    }

    pub fn record_viability(
        env: Env,
        custodian: Address,
        lot_id: u32,
        viability_score: u32,
        note: String,
    ) -> SeedLot {
        require_initialized(&env);
        custodian.require_auth();
        assert_valid_score(&env, viability_score);

        let mut lot = read_lot_or_panic(&env, lot_id);
        assert_not_distributed(&env, &lot);

        if custodian != lot.custodian {
            panic_with_error!(&env, SeedError::NotCustodian);
        }

        lot.viability_score = viability_score;
        lot.updated_at = env.ledger().timestamp();

        if lot.status != STATUS_RISK_FLAGGED {
            lot.status = if viability_score < 50 {
                STATUS_UNDER_REVIEW
            } else {
                STATUS_ACTIVE
            };
        }

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "record_viability"),
            custodian,
            0,
            note,
        );

        let mut stats = read_stats(&env);
        stats.custody_records = checked_add(&env, stats.custody_records, 1);
        write_stats(&env, &stats);

        ViabilityRecordedEvent {
            lot_id,
            record_id,
            viability_score,
        }
        .publish(&env);

        lot
    }

    pub fn reserve_samples(
        env: Env,
        researcher: Address,
        lot_id: u32,
        amount: u32,
        purpose: String,
    ) -> SeedLot {
        require_initialized(&env);
        researcher.require_auth();
        assert_positive(&env, amount);

        let mut lot = read_lot_or_panic(&env, lot_id);
        assert_not_distributed(&env, &lot);

        if lot.available_samples < amount {
            panic_with_error!(&env, SeedError::InsufficientSamples);
        }

        lot.available_samples = checked_sub(&env, lot.available_samples, amount);
        lot.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "reserve_samples"),
            researcher,
            amount,
            purpose,
        );

        let mut stats = read_stats(&env);
        stats.available_samples = checked_sub(&env, stats.available_samples, amount);
        stats.custody_records = checked_add(&env, stats.custody_records, 1);
        write_stats(&env, &stats);

        SamplesReservedEvent {
            lot_id,
            record_id,
            amount,
        }
        .publish(&env);

        lot
    }

    pub fn release_samples(
        env: Env,
        researcher: Address,
        lot_id: u32,
        amount: u32,
        note: String,
    ) -> SeedLot {
        require_initialized(&env);
        researcher.require_auth();
        assert_positive(&env, amount);

        let mut lot = read_lot_or_panic(&env, lot_id);
        assert_not_distributed(&env, &lot);

        let new_available = checked_add(&env, lot.available_samples, amount);
        if new_available > lot.total_samples {
            panic_with_error!(&env, SeedError::Overflow);
        }

        lot.available_samples = new_available;
        lot.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "release_samples"),
            researcher,
            amount,
            note,
        );

        let mut stats = read_stats(&env);
        stats.available_samples = checked_add(&env, stats.available_samples, amount);
        stats.custody_records = checked_add(&env, stats.custody_records, 1);
        write_stats(&env, &stats);

        SamplesReleasedEvent {
            lot_id,
            record_id,
            amount,
        }
        .publish(&env);

        lot
    }

    pub fn flag_risk(
        env: Env,
        custodian: Address,
        lot_id: u32,
        risk_score: u32,
        reason: String,
    ) -> SeedLot {
        require_initialized(&env);
        custodian.require_auth();
        assert_valid_score(&env, risk_score);

        let mut lot = read_lot_or_panic(&env, lot_id);
        assert_not_distributed(&env, &lot);

        if custodian != lot.custodian {
            panic_with_error!(&env, SeedError::NotCustodian);
        }

        let was_risk = lot.status == STATUS_RISK_FLAGGED;

        lot.status = STATUS_RISK_FLAGGED;
        lot.risk_score = risk_score;
        lot.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "flag_risk"),
            custodian,
            0,
            reason,
        );

        let mut stats = read_stats(&env);
        if !was_risk {
            stats.risk_lots = checked_add(&env, stats.risk_lots, 1);
        }
        stats.custody_records = checked_add(&env, stats.custody_records, 1);
        write_stats(&env, &stats);

        RiskFlaggedEvent {
            lot_id,
            record_id,
            risk_score,
        }
        .publish(&env);

        lot
    }

    pub fn mark_distributed(
        env: Env,
        custodian: Address,
        lot_id: u32,
        amount: u32,
        recipient_note: String,
    ) -> SeedLot {
        require_initialized(&env);
        custodian.require_auth();
        assert_positive(&env, amount);

        let mut lot = read_lot_or_panic(&env, lot_id);
        assert_not_distributed(&env, &lot);

        if custodian != lot.custodian {
            panic_with_error!(&env, SeedError::NotCustodian);
        }

        if lot.available_samples < amount {
            panic_with_error!(&env, SeedError::InsufficientSamples);
        }

        let previous_status = lot.status;

        lot.available_samples = checked_sub(&env, lot.available_samples, amount);
        lot.updated_at = env.ledger().timestamp();

        let fully_distributed = lot.available_samples == 0;
        if fully_distributed {
            lot.status = STATUS_DISTRIBUTED;
        }

        env.storage().persistent().set(&DataKey::Lot(lot_id), &lot);

        let record_id = append_record(
            &env,
            lot_id,
            String::from_str(&env, "mark_distributed"),
            custodian,
            amount,
            recipient_note,
        );

        let mut stats = read_stats(&env);
        stats.available_samples = checked_sub(&env, stats.available_samples, amount);
        stats.custody_records = checked_add(&env, stats.custody_records, 1);

        if fully_distributed {
            if stats.active_lots > 0 {
                stats.active_lots = checked_sub(&env, stats.active_lots, 1);
            }

            if previous_status == STATUS_RISK_FLAGGED && stats.risk_lots > 0 {
                stats.risk_lots = checked_sub(&env, stats.risk_lots, 1);
            }

            stats.distributed_lots = checked_add(&env, stats.distributed_lots, 1);
        }

        write_stats(&env, &stats);

        DistributedEvent {
            lot_id,
            record_id,
            amount,
        }
        .publish(&env);

        lot
    }

    pub fn get_seed_lot(env: Env, lot_id: u32) -> SeedLot {
        require_initialized(&env);
        read_lot_or_panic(&env, lot_id)
    }

    pub fn get_custody_record(env: Env, record_id: u32) -> CustodyRecord {
        require_initialized(&env);

        match env
            .storage()
            .persistent()
            .get::<DataKey, CustodyRecord>(&DataKey::Record(record_id))
        {
            Some(record) => record,
            None => panic_with_error!(&env, SeedError::SeedLotNotFound),
        }
    }

    pub fn get_custody_count(env: Env) -> u32 {
        require_initialized(&env);
        read_record_counter(&env)
    }

    pub fn get_stats(env: Env) -> RegistryStats {
        require_initialized(&env);
        read_stats(&env)
    }

    pub fn get_config(env: Env) -> PlatformConfig {
        require_initialized(&env)
    }
}

fn require_initialized(env: &Env) -> PlatformConfig {
    match env
        .storage()
        .persistent()
        .get::<DataKey, PlatformConfig>(&DataKey::Config)
    {
        Some(config) => config,
        None => panic_with_error!(env, SeedError::NotInitialized),
    }
}

fn read_lot_counter(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get::<DataKey, u32>(&DataKey::LotCounter)
        .unwrap_or(0)
}

fn read_record_counter(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get::<DataKey, u32>(&DataKey::RecordCounter)
        .unwrap_or(0)
}

fn read_stats(env: &Env) -> RegistryStats {
    env.storage()
        .persistent()
        .get::<DataKey, RegistryStats>(&DataKey::Stats)
        .unwrap_or(RegistryStats {
            total_lots: 0,
            active_lots: 0,
            distributed_lots: 0,
            risk_lots: 0,
            total_samples: 0,
            available_samples: 0,
            custody_records: 0,
        })
}

fn write_stats(env: &Env, stats: &RegistryStats) {
    env.storage().persistent().set(&DataKey::Stats, stats);
}

fn read_lot_or_panic(env: &Env, lot_id: u32) -> SeedLot {
    match env
        .storage()
        .persistent()
        .get::<DataKey, SeedLot>(&DataKey::Lot(lot_id))
    {
        Some(lot) => lot,
        None => panic_with_error!(env, SeedError::SeedLotNotFound),
    }
}

fn append_record(
    env: &Env,
    lot_id: u32,
    action: String,
    actor: Address,
    amount: u32,
    note: String,
) -> u32 {
    let record_id = checked_add(env, read_record_counter(env), 1);

    let record = CustodyRecord {
        record_id,
        lot_id,
        action,
        actor,
        amount,
        note,
        timestamp: env.ledger().timestamp(),
    };

    env.storage()
        .persistent()
        .set(&DataKey::Record(record_id), &record);

    env.storage()
        .persistent()
        .set(&DataKey::RecordCounter, &record_id);

    record_id
}

fn assert_positive(env: &Env, amount: u32) {
    if amount == 0 {
        panic_with_error!(env, SeedError::InvalidAmount);
    }
}

fn assert_valid_score(env: &Env, score: u32) {
    if score > 100 {
        panic_with_error!(env, SeedError::InvalidScore);
    }
}

fn assert_not_distributed(env: &Env, lot: &SeedLot) {
    if lot.status == STATUS_DISTRIBUTED {
        panic_with_error!(env, SeedError::AlreadyDistributed);
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
        None => panic_with_error!(env, SeedError::InsufficientSamples),
    }
}

mod test;
