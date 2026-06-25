#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_initialized_client(env: &Env) -> (BiodiversitySeedClient<'_>, Address) {
    env.mock_all_auths();

    let contract_id = env.register(BiodiversitySeed, ());
    let client = BiodiversitySeedClient::new(env, &contract_id);

    let admin = Address::generate(env);
    client.initialize(&admin, &String::from_str(env, "Vietnam Seed Bank"));

    (client, admin)
}

#[test]
fn initialize_creates_platform_config_and_zero_stats() {
    let env = Env::default();
    let (client, admin) = create_initialized_client(&env);

    let config = client.get_config();
    let stats = client.get_stats();

    assert_eq!(config.admin, admin);
    assert_eq!(
        config.institution,
        String::from_str(&env, "Vietnam Seed Bank")
    );
    assert_eq!(stats.total_lots, 0);
    assert_eq!(stats.available_samples, 0);
}

#[test]
#[should_panic]
fn initialize_can_only_run_once() {
    let env = Env::default();
    let (client, admin) = create_initialized_client(&env);

    client.initialize(&admin, &String::from_str(&env, "Second init"));
}

#[test]
fn create_seed_lot_stores_metadata_and_updates_stats() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-RICE-001"),
        &String::from_str(&env, "Oryza sativa"),
        &String::from_str(&env, "Mekong Delta"),
        &1000,
        &92,
    );

    let stored = client.get_seed_lot(&lot.lot_id);
    let stats = client.get_stats();

    assert_eq!(lot.lot_id, 1);
    assert_eq!(stored.accession_code, String::from_str(&env, "VN-RICE-001"));
    assert_eq!(stored.total_samples, 1000);
    assert_eq!(stored.available_samples, 1000);
    assert_eq!(stored.status, STATUS_ACTIVE);
    assert_eq!(stats.total_lots, 1);
    assert_eq!(stats.active_lots, 1);
    assert_eq!(stats.available_samples, 1000);
    assert_eq!(stats.custody_records, 1);
}

#[test]
fn low_viability_seed_lot_starts_under_review() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-RARE-LOW-001"),
        &String::from_str(&env, "Rare native seed"),
        &String::from_str(&env, "Central Highlands"),
        &200,
        &38,
    );

    assert_eq!(lot.status, STATUS_UNDER_REVIEW);
    assert_eq!(lot.viability_score, 38);
}

#[test]
fn reserve_and_release_samples_update_available_balance() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);
    let researcher = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-MAIZE-001"),
        &String::from_str(&env, "Zea mays"),
        &String::from_str(&env, "Da Lat"),
        &500,
        &88,
    );

    let after_reserve = client.reserve_samples(
        &researcher,
        &lot.lot_id,
        &120,
        &String::from_str(&env, "drought tolerance study"),
    );

    assert_eq!(after_reserve.available_samples, 380);

    let after_release = client.release_samples(
        &researcher,
        &lot.lot_id,
        &20,
        &String::from_str(&env, "returned unused samples"),
    );

    let stats = client.get_stats();

    assert_eq!(after_release.available_samples, 400);
    assert_eq!(stats.available_samples, 400);
    assert_eq!(stats.custody_records, 3);
}

#[test]
fn transfer_custody_changes_custodian_and_records_history() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);
    let new_custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-BEAN-001"),
        &String::from_str(&env, "Vigna radiata"),
        &String::from_str(&env, "Can Tho"),
        &300,
        &81,
    );

    let transferred = client.transfer_custody(
        &custodian,
        &new_custodian,
        &lot.lot_id,
        &String::from_str(&env, "moved to regional seed bank"),
    );

    let record = client.get_custody_record(&2);

    assert_eq!(transferred.custodian, new_custodian);
    assert_eq!(record.action, String::from_str(&env, "transfer_custody"));
    assert_eq!(client.get_custody_count(), 2);
}

#[test]
#[should_panic]
fn non_custodian_cannot_transfer_custody() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);
    let attacker = Address::generate(&env);
    let new_custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-COFFEE-001"),
        &String::from_str(&env, "Arabica coffee"),
        &String::from_str(&env, "Lam Dong"),
        &150,
        &77,
    );

    client.transfer_custody(
        &attacker,
        &new_custodian,
        &lot.lot_id,
        &String::from_str(&env, "unauthorized move"),
    );
}

#[test]
fn record_viability_can_move_seed_lot_under_review() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-HERB-001"),
        &String::from_str(&env, "Medicinal herb"),
        &String::from_str(&env, "Sa Pa"),
        &90,
        &86,
    );

    let reviewed = client.record_viability(
        &custodian,
        &lot.lot_id,
        &45,
        &String::from_str(&env, "cold storage viability review"),
    );

    assert_eq!(reviewed.viability_score, 45);
    assert_eq!(reviewed.status, STATUS_UNDER_REVIEW);
}

#[test]
fn flag_risk_updates_risk_status_and_stats() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-WILD-001"),
        &String::from_str(&env, "Wild native grass"),
        &String::from_str(&env, "Ninh Thuan"),
        &80,
        &70,
    );

    let risk = client.flag_risk(
        &custodian,
        &lot.lot_id,
        &65,
        &String::from_str(&env, "heat exposure during transport"),
    );

    let stats = client.get_stats();

    assert_eq!(risk.status, STATUS_RISK_FLAGGED);
    assert_eq!(risk.risk_score, 65);
    assert_eq!(stats.risk_lots, 1);
}

#[test]
fn mark_distributed_closes_lot_when_all_samples_are_distributed() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-RICE-LOCAL-002"),
        &String::from_str(&env, "Local rice variety"),
        &String::from_str(&env, "Soc Trang"),
        &60,
        &93,
    );

    let distributed = client.mark_distributed(
        &custodian,
        &lot.lot_id,
        &60,
        &String::from_str(&env, "distributed to community seed bank"),
    );

    let stats = client.get_stats();

    assert_eq!(distributed.available_samples, 0);
    assert_eq!(distributed.status, STATUS_DISTRIBUTED);
    assert_eq!(stats.active_lots, 0);
    assert_eq!(stats.distributed_lots, 1);
    assert_eq!(stats.available_samples, 0);
}

#[test]
#[should_panic]
fn cannot_reserve_more_than_available() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);
    let researcher = Address::generate(&env);

    let lot = client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-OVER-001"),
        &String::from_str(&env, "Test seed"),
        &String::from_str(&env, "Test origin"),
        &10,
        &80,
    );

    client.reserve_samples(
        &researcher,
        &lot.lot_id,
        &100,
        &String::from_str(&env, "over reserve"),
    );
}

#[test]
#[should_panic]
fn invalid_score_is_rejected() {
    let env = Env::default();
    let (client, _admin) = create_initialized_client(&env);

    let custodian = Address::generate(&env);

    client.create_seed_lot(
        &custodian,
        &String::from_str(&env, "VN-BAD-SCORE"),
        &String::from_str(&env, "Invalid"),
        &String::from_str(&env, "Invalid"),
        &20,
        &101,
    );
}
