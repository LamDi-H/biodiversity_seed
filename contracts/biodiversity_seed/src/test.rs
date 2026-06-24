#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn register_lot_stores_seed_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BiodiversitySeed, ());
    let client = BiodiversitySeedClient::new(&env, &contract_id);

    let custodian = Address::generate(&env);

    let lot_id = client.register_lot(
        &custodian,
        &String::from_str(&env, "Oryza sativa"),
        &String::from_str(&env, "Vietnam"),
        &1000,
    );

    let lot = client.get_lot(&lot_id);

    assert_eq!(lot_id, 1);
    assert_eq!(lot.total, 1000);
    assert_eq!(lot.available, 1000);
}

#[test]
fn checkout_and_return_updates_available_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BiodiversitySeed, ());
    let client = BiodiversitySeedClient::new(&env, &contract_id);

    let custodian = Address::generate(&env);
    let researcher = Address::generate(&env);

    let lot_id = client.register_lot(
        &custodian,
        &String::from_str(&env, "Zea mays"),
        &String::from_str(&env, "Da Lat"),
        &500,
    );

    let after_checkout = client.checkout(
        &researcher,
        &lot_id,
        &120,
        &String::from_str(&env, "drought tolerance study"),
    );

    assert_eq!(after_checkout.available, 380);

    let after_return = client.return_seeds(
        &researcher,
        &lot_id,
        &20,
        &String::from_str(&env, "returned unused seeds"),
    );

    assert_eq!(after_return.available, 400);
}

#[test]
fn custodian_can_deplete_seed_lot() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BiodiversitySeed, ());
    let client = BiodiversitySeedClient::new(&env, &contract_id);

    let custodian = Address::generate(&env);

    let lot_id = client.register_lot(
        &custodian,
        &String::from_str(&env, "Glycine max"),
        &String::from_str(&env, "Can Tho"),
        &300,
    );

    let after_deplete = client.deplete(
        &custodian,
        &lot_id,
        &50,
        &String::from_str(&env, "failed viability test"),
    );

    assert_eq!(after_deplete.total, 250);
    assert_eq!(after_deplete.available, 250);
}

#[test]
#[should_panic]
fn cannot_checkout_more_than_available() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BiodiversitySeed, ());
    let client = BiodiversitySeedClient::new(&env, &contract_id);

    let custodian = Address::generate(&env);
    let researcher = Address::generate(&env);

    let lot_id = client.register_lot(
        &custodian,
        &String::from_str(&env, "Arabica coffee"),
        &String::from_str(&env, "Lam Dong"),
        &10,
    );

    client.checkout(
        &researcher,
        &lot_id,
        &100,
        &String::from_str(&env, "over checkout test"),
    );
}